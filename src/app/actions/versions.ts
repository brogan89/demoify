"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, canManageSongs } from "@/lib/band";
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
    include: { band: { select: { username: true } } },
  });
  if (!project) return { error: "Project not found" };

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  // D1 (SQLite) has no interactive transactions, so we can't read-then-write in one
  // atomic block. Instead: charge atomically up front (conditional decrement), then
  // write the version + ledger in one batch, refunding the charge if that write fails.

  // 1. Charge the band's credits — atomic and conditional; guards double-spend.
  const charged = await prisma.band.updateMany({
    where: { id: project.bandId, credits: { gte: UPLOAD_COST } },
    data: { credits: { decrement: UPLOAD_COST } },
  });
  if (charged.count === 0) {
    return {
      error: `Not enough credits. Each upload costs ${UPLOAD_COST} credits.`,
      code: INSUFFICIENT_CREDITS,
    };
  }

  try {
    // 2. Assign the next version number and write. The (projectId, versionNumber)
    // unique constraint guards concurrent inserts — on collision, retry with a
    // freshly-read number. Version row + ledger row commit together in one batch.
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await prisma.songVersion.findFirst({
        where: { projectId: project.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const versionNumber = (last?.versionNumber ?? 0) + 1;

      try {
        const [version] = await prisma.$transaction([
          prisma.songVersion.create({
            data: {
              projectId: project.id,
              versionNumber,
              audioUrl: input.audioUrl,
              changelog: input.changelog?.trim() || null,
              duration: input.duration ?? null,
            },
          }),
          prisma.creditTransaction.create({
            data: { bandId: project.bandId, delta: -UPLOAD_COST, reason: "upload" },
          }),
        ]);

        revalidatePath(`/dashboard/${project.id}`);
        revalidatePath(`/${project.band.username}/${project.slug}`);
        return { version };
      } catch (err) {
        // Unique collision on (projectId, versionNumber) → another upload raced us; retry.
        if ((err as { code?: string }).code === "P2002") continue;
        throw err;
      }
    }
    throw new Error("Could not assign a version number after several attempts");
  } catch (err) {
    // 3. The write failed after we charged — refund so credits aren't lost.
    await prisma.band.update({
      where: { id: project.bandId },
      data: { credits: { increment: UPLOAD_COST } },
    });
    throw err;
  }
}
