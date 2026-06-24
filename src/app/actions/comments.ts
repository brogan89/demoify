"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const MAX_COMMENT_LENGTH = 2000;

type AddCommentInput = {
  projectId: string;
  versionId: string;
  body: string;
};

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
    include: { project: { include: { owner: { select: { username: true } } } } },
  });
  if (!version || version.projectId !== input.projectId) {
    return { error: "Version not found" };
  }

  await prisma.comment.create({
    data: {
      projectId: input.projectId,
      versionId: input.versionId,
      authorId: user.id,
      body,
    },
  });

  revalidatePath(`/${version.project.owner.username}/${version.project.slug}`);
  revalidatePath(`/dashboard/${input.projectId}`);
  return { ok: true };
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { project: { include: { owner: { select: { username: true } } } } },
  });
  if (!comment) return { error: "Comment not found" };

  // The author or the song owner may delete a comment.
  const canDelete =
    comment.authorId === user.id || comment.project.ownerId === user.id;
  if (!canDelete) return { error: "Not allowed" };

  await prisma.comment.delete({ where: { id: commentId } });

  revalidatePath(`/${comment.project.owner.username}/${comment.project.slug}`);
  revalidatePath(`/dashboard/${comment.projectId}`);
  return { ok: true };
}
