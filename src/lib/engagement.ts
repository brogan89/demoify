import { prisma } from "@/lib/db";
import { getActiveBand, getMembership, isMember } from "@/lib/band";
import { ENGAGEMENT_CREDITS, type EngagementReason } from "@/lib/credits";

/**
 * Award engagement credits to the *engager's* active band for interacting with
 * another band's song. Returns the number of credits granted, or 0 if skipped.
 *
 * Granted at most once per (engager, reason, song): a unique constraint on the
 * ledger makes the grant idempotent, so re-liking, re-commenting, or replaying
 * the same song never pays out twice. No payout for engaging a band you belong
 * to (no self-farming).
 */
export async function grantEngagementCredits(opts: {
  engagerUserId: string;
  songBandId: string;
  projectId: string;
  reason: EngagementReason;
}): Promise<number> {
  const { engagerUserId, songBandId, projectId, reason } = opts;

  // No credit for engaging your own band's songs.
  const ownRole = await getMembership(songBandId, engagerUserId);
  if (isMember(ownRole)) return 0;

  // Credits land in the band the engager is currently acting as.
  const active = await getActiveBand();
  if (!active) return 0;

  const amount = ENGAGEMENT_CREDITS[reason];
  try {
    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          bandId: active.band.id,
          userId: engagerUserId,
          refId: projectId,
          reason,
          delta: amount,
        },
      }),
      prisma.band.update({
        where: { id: active.band.id },
        data: { credits: { increment: amount } },
      }),
    ]);
    return amount;
  } catch (err) {
    // P2002 = unique violation on (userId, reason, refId) = already earned.
    if ((err as { code?: string }).code === "P2002") return 0;
    throw err;
  }
}
