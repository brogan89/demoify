"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { grantEngagementCredits } from "@/lib/engagement";

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

// Listening to a song start-to-end rewards the listener with credits (once per
// song; not for your own band's songs). Anonymous listeners still get their play
// counted via recordPlay — they just don't earn credits.
export async function recordFullPlay(projectId: string): Promise<{ earned: number }> {
  const user = await getCurrentUser();
  if (!user) return { earned: 0 };

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    select: { bandId: true },
  });
  if (!project) return { earned: 0 };

  const earned = await grantEngagementCredits({
    engagerUserId: user.id,
    songBandId: project.bandId,
    projectId,
    reason: "play",
  });
  return { earned };
}
