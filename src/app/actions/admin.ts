"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isCurrentUserAdmin } from "@/lib/admin";
import { normalizeUsername } from "@/lib/username";

type ResolvedBand = { id: string; username: string; displayName: string };

/**
 * Resolve a "band username or user's email" input down to the one band to
 * credit. Band username is tried first (exact, normalized match); falling
 * back to email only makes sense when the user belongs to exactly one band —
 * ambiguous (0 or 2+ bands) cases are rejected rather than guessed at.
 */
async function resolveTargetBand(target: string): Promise<ResolvedBand | { error: string }> {
  const raw = target.trim();
  if (!raw) return { error: "Enter a band username or user email" };

  const byUsername = await prisma.band.findUnique({
    where: { username: normalizeUsername(raw) },
    select: { id: true, username: true, displayName: true },
  });
  if (byUsername) return byUsername;

  if (raw.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: raw.toLowerCase() },
      select: { id: true },
    });
    if (!user) return { error: "No band or user found for that input" };

    const memberships = await prisma.bandMembership.findMany({
      where: { userId: user.id },
      select: { band: { select: { id: true, username: true, displayName: true } } },
    });
    if (memberships.length === 0) {
      return { error: "This user has no artist profile to credit" };
    }
    if (memberships.length > 1) {
      return { error: "This user belongs to multiple artist profiles — use the band's username instead" };
    }
    return memberships[0].band;
  }

  return { error: "No band or user found for that input" };
}

export type GiftRow = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  band: { username: string; displayName: string };
};

/** Directly credit a band's balance. Admin-only — bypasses coupons entirely. */
export async function giftCredits(input: {
  target: string;
  amount: number;
  note?: string;
}): Promise<{ ok: true; band: string; amount: number } | { error: string }> {
  if (!(await isCurrentUserAdmin())) return { error: "Unauthorized" };

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { error: "Amount must be a positive whole number" };
  }

  const band = await resolveTargetBand(input.target);
  if ("error" in band) return band;

  const note = input.note?.trim() || null;

  await prisma.$transaction([
    prisma.creditTransaction.create({
      data: { bandId: band.id, delta: input.amount, reason: "gift", note },
    }),
    prisma.band.update({
      where: { id: band.id },
      data: { credits: { increment: input.amount } },
    }),
  ]);

  revalidatePath("/admin/credits");
  return { ok: true, band: band.displayName, amount: input.amount };
}
