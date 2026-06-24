"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, isMember, canManageSongs } from "@/lib/band";

const MAX_COMMENT_LENGTH = 2000;

type AddCommentInput = {
  projectId: string;
  versionId: string;
  body: string;
  timestampSeconds?: number | null;
};

const MAX_TIMESTAMP_SECONDS = 86400; // 24h — a sane upper bound for any track.

export async function addComment(input: AddCommentInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const body = input.body.trim();
  if (!body) return { error: "Comment can't be empty" };
  if (body.length > MAX_COMMENT_LENGTH) {
    return { error: `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer` };
  }

  // The tagged version must belong to the project — guards spoofed version ids.
  const version = await prisma.songVersion.findUnique({
    where: { id: input.versionId },
    include: { project: { include: { band: { select: { username: true } } } } },
  });
  if (!version || version.projectId !== input.projectId) {
    return { error: "Version not found" };
  }

  // Validate an optional playback-position anchor.
  let timestampSeconds: number | null = null;
  if (input.timestampSeconds != null) {
    const t = Math.round(input.timestampSeconds);
    if (!Number.isFinite(t) || t < 0 || t >= MAX_TIMESTAMP_SECONDS) {
      return { error: "Invalid timestamp" };
    }
    if (version.duration && t > Math.ceil(version.duration)) {
      return { error: "Timestamp is past the end of the track" };
    }
    timestampSeconds = t;
  }

  // Public songs: any logged-in user. Private songs: band members only.
  if (version.project.visibility === "PRIVATE") {
    const role = await getMembership(version.project.bandId, user.id);
    if (!isMember(role)) return { error: "Not allowed" };
  }

  await prisma.comment.create({
    data: {
      projectId: input.projectId,
      versionId: input.versionId,
      authorId: user.id,
      body,
      timestampSeconds,
    },
  });

  revalidatePath(`/${version.project.band.username}/${version.project.slug}`);
  revalidatePath(`/dashboard/${input.projectId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { project: { include: { band: { select: { username: true } } } } },
  });
  if (!comment) return { error: "Comment not found" };

  // The author, or a band ADMIN/MANAGER, may delete a comment.
  let canDelete = comment.authorId === user.id;
  if (!canDelete) {
    const role = await getMembership(comment.project.bandId, user.id);
    canDelete = canManageSongs(role);
  }
  if (!canDelete) return { error: "Not allowed" };

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath(`/${comment.project.band.username}/${comment.project.slug}`);
  revalidatePath(`/dashboard/${comment.projectId}`);
  return { ok: true };
}
