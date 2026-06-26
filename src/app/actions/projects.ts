"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
// NOTE: createProject no longer redirects — it returns the new project id so the
// caller (CreateSongForm) can upload the first audio version before navigating.
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand, getMembership, canManageSongs } from "@/lib/band";
import { isR2Configured, r2, R2_BUCKET } from "@/lib/r2";
import { slugify, uniqueSlug } from "@/lib/slug";
import { normalizeGenre } from "@/lib/genres";
import { syncTrack, removeTrack } from "@/lib/federation";

export async function createProject(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveBand();
  // Only ADMIN/MANAGER may add songs; members get no create form, but guard anyway.
  if (!active || !canManageSongs(active.role)) redirect("/dashboard");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return { error: "Title is required" };

  const { genre, subgenre } = normalizeGenre(
    formData.get("genre")?.toString(),
    formData.get("subgenre")?.toString(),
  );

  const existing = await prisma.songProject.findMany({
    where: { bandId: active.band.id },
    select: { slug: true },
  });
  const slug = uniqueSlug(slugify(title), new Set(existing.map((p) => p.slug)));

  const project = await prisma.songProject.create({
    data: { bandId: active.band.id, ownerId: user.id, title, description, slug, genre, subgenre },
  });

  revalidatePath("/dashboard");
  return { projectId: project.id };
}

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: { band: { select: { username: true } } },
  });
  if (!project) return { error: "Song not found" };

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  // Best-effort cleanup of the song's audio files in R2. All keys for a project
  // share the `songs/<projectId>/` prefix (see the presign route). Failures here
  // shouldn't block the delete — orphaned objects are harmless.
  if (isR2Configured()) {
    try {
      const listed = await r2().send(
        new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: `songs/${projectId}/` }),
      );
      const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key! }));
      if (keys.length > 0) {
        await r2().send(
          new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys } }),
        );
      }
    } catch (err) {
      console.error("R2 cleanup failed for project", projectId, err);
    }
  }

  // Versions and comments cascade-delete via the schema's onDelete: Cascade.
  await prisma.songProject.delete({ where: { id: projectId } });

  // Drop any mirror of this song from the federation hub.
  await removeTrack(projectId);

  revalidatePath("/dashboard");
  revalidatePath(`/${project.band.username}/${project.slug}`);
  return { ok: true };
}

/** Songs owned by the band the user is currently acting as. */
export async function listBandProjects() {
  const active = await getActiveBand();
  if (!active) return [];
  return prisma.songProject.findMany({
    where: { bandId: active.band.id },
    orderBy: { createdAt: "desc" },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
  });
}

export async function setSongVisibility(
  projectId: string,
  visibility: "PUBLIC" | "PRIVATE",
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (visibility !== "PUBLIC" && visibility !== "PRIVATE") {
    return { error: "Invalid visibility" };
  }

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: { band: { select: { username: true } } },
  });
  if (!project) return { error: "Song not found" };

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  await prisma.songProject.update({ where: { id: projectId }, data: { visibility } });

  // Mirror to / remove from the federation hub. syncTrack itself removes when the
  // song isn't publicly playable, so it handles the PRIVATE case too.
  await syncTrack(projectId);

  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/${project.band.username}/${project.slug}`);
  return { ok: true };
}

export async function setSongGenre(
  projectId: string,
  rawGenre: string | null,
  rawSubgenre: string | null,
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: { band: { select: { username: true } } },
  });
  if (!project) return { error: "Song not found" };

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  // normalizeGenre clears an invalid/unknown genre and drops a subgenre that
  // doesn't belong to the chosen genre.
  const { genre, subgenre } = normalizeGenre(rawGenre, rawSubgenre);
  await prisma.songProject.update({
    where: { id: projectId },
    data: { genre, subgenre },
  });

  // Keep the hub mirror's genre in sync (no-op unless public + federated).
  await syncTrack(projectId);

  revalidatePath(`/dashboard/${projectId}`);
  revalidatePath(`/${project.band.username}/${project.slug}`);
  return { ok: true };
}
