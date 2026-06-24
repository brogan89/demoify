"use server";

import { prisma } from "@/lib/db";

// Record a single play against a song URL (project), not the version — so the
// count survives new version uploads. Public/anonymous: no auth required.
// Deliberately no revalidatePath: plays happen constantly and the client updates
// the displayed count optimistically, so re-rendering the page would be wasteful.
export async function recordPlay(projectId: string) {
  await prisma.songProject.update({
    where: { id: projectId },
    data: { playCount: { increment: 1 } },
  });
}
