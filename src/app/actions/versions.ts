"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { UPLOAD_COST } from "@/lib/credits";

const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS";

type CreateVersionInput = {
  projectId: string;
  audioUrl: string;
  changelog?: string | null;
  duration?: number | null;
};

export async function createVersion(input: CreateVersionInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const project = await prisma.songProject.findUnique({
    where: { id: input.projectId },
    include: { owner: { select: { username: true } } },
  });
  if (!project || project.ownerId !== user.id) {
    return { error: "Project not found" };
  }

  try {
    // One transaction: verify balance, create the version, charge credits, log it.
    // The (projectId, versionNumber) unique constraint guards concurrent inserts;
    // the conditional credit decrement guards concurrent double-spends.
    const version = await prisma.$transaction(async (tx) => {
      const charged = await tx.user.updateMany({
        where: { id: user.id, credits: { gte: UPLOAD_COST } },
        data: { credits: { decrement: UPLOAD_COST } },
      });
      if (charged.count === 0) throw new Error(INSUFFICIENT_CREDITS);

      const last = await tx.songVersion.findFirst({
        where: { projectId: project.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const versionNumber = (last?.versionNumber ?? 0) + 1;

      const created = await tx.songVersion.create({
        data: {
          projectId: project.id,
          versionNumber,
          audioUrl: input.audioUrl,
          changelog: input.changelog?.trim() || null,
          duration: input.duration ?? null,
        },
      });

      await tx.creditTransaction.create({
        data: { userId: user.id, delta: -UPLOAD_COST, reason: "upload" },
      });

      return created;
    });

    revalidatePath(`/dashboard/${project.id}`);
    revalidatePath(`/${project.owner.username}/${project.slug}`);
    return { version };
  } catch (err) {
    if (err instanceof Error && err.message === INSUFFICIENT_CREDITS) {
      return {
        error: `Not enough credits. Each upload costs ${UPLOAD_COST} credits.`,
        code: INSUFFICIENT_CREDITS,
      };
    }
    throw err;
  }
}
