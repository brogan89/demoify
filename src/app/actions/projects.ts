"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isR2Configured, r2, R2_BUCKET } from "@/lib/r2";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function createProject(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return;

  const existing = await prisma.songProject.findMany({
    where: { ownerId: user.id },
    select: { slug: true },
  });
  const slug = uniqueSlug(slugify(title), new Set(existing.map((p) => p.slug)));

  const project = await prisma.songProject.create({
    data: { ownerId: user.id, title, description, slug },
  });

  revalidatePath("/dashboard");
  redirect(`/dashboard/${project.id}`);
}

export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: { owner: { select: { username: true } } },
  });
  if (!project || project.ownerId !== user.id) {
    return { error: "Song not found" };
  }

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

  revalidatePath("/dashboard");
  revalidatePath(`/${project.owner.username}/${project.slug}`);
  return { ok: true };
}

export async function listMyProjects() {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.songProject.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      _count: { select: { versions: true } },
    },
  });
}
