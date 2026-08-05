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

// Listening to a song for PLAY_CREDIT_SECONDS (or nearly all of a shorter song)
// rewards the listener with credits (once per song; not for your own band's
// songs). The threshold is enforced client-side by the player — like recordPlay,
// this action trusts the client. The ledger `reason` stays "play" so credits
// earned under the old full-play rule keep blocking re-earns on the same song.
// Anonymous listeners still get their play counted via recordPlay — they just
// don't earn credits.
export async function recordListen(projectId: string): Promise<{ earned: number }> {
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
