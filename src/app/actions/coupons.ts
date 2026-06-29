"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isCurrentUserAdmin } from "@/lib/admin";
import { creditsEnabled } from "@/lib/credits";

type CouponKind = "FREE_CREDITS" | "PERCENT_OFF" | "FIXED_OFF";
const KINDS: CouponKind[] = ["FREE_CREDITS", "PERCENT_OFF", "FIXED_OFF"];

function isExpired(expiresAt: Date | null): boolean {
  return expiresAt !== null && expiresAt < new Date();
}

function isExhausted(maxRedemptions: number | null, redemptionCount: number): boolean {
  return maxRedemptions !== null && redemptionCount >= maxRedemptions;
}

/**
 * Redeem a FREE_CREDITS coupon code, granting credits to the caller's active
 * band. Discount-kind codes are rejected here — those are applied through
 * checkout (see validateCoupon + /api/credits/checkout), never redeemed
 * directly, since they don't move credits on their own.
 */
export async function redeemCoupon(
  code: string,
): Promise<{ ok: true; kind: "FREE_CREDITS"; credits: number } | { error: string }> {
  if (!creditsEnabled()) return { error: "The credit economy is disabled on this instance." };

  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const active = await getActiveBand();
  if (!active) return { error: "No active band" };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a code" };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) return { error: "Invalid code" };
  if (coupon.kind !== "FREE_CREDITS") {
    return { error: "This code is a discount — apply it when buying credits." };
  }
  if (isExpired(coupon.expiresAt)) return { error: "This code has expired" };
  // Check-then-act, accepting the small race window — same style as the
  // last-admin guard in src/app/actions/bands.ts.
  if (isExhausted(coupon.maxRedemptions, coupon.redemptionCount)) {
    return { error: "This code has reached its redemption limit" };
  }

  try {
    await prisma.$transaction([
      prisma.couponRedemption.create({
        data: { couponId: coupon.id, bandId: active.band.id, userId: user.id },
      }),
      prisma.creditTransaction.create({
        data: {
          bandId: active.band.id,
          userId: user.id,
          refId: coupon.id,
          reason: "coupon",
          delta: coupon.amount,
        },
      }),
      prisma.band.update({
        where: { id: active.band.id },
        data: { credits: { increment: coupon.amount } },
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { redemptionCount: { increment: 1 } },
      }),
    ]);
  } catch (err) {
    // P2002 = unique violation on (couponId, bandId) or (couponId, userId) —
    // already redeemed by this band, or by this user under a different band.
    if ((err as { code?: string }).code === "P2002") {
      return { error: "You've already redeemed this code" };
    }
    throw err;
  }

  revalidatePath("/dashboard/credits");
  return { ok: true, kind: "FREE_CREDITS", credits: coupon.amount };
}

/**
 * Validate a coupon for use at checkout WITHOUT writing any DB rows — payment
 * hasn't happened yet. FREE_CREDITS codes are rejected here; use redeemCoupon
 * for those instead. The actual CouponRedemption row for a discount code is
 * only ever created by the webhook, once Stripe confirms payment.
 */
export async function validateCoupon(
  code: string,
): Promise<
  | { ok: true; kind: "PERCENT_OFF" | "FIXED_OFF"; amount: number; code: string }
  | { error: string }
> {
  if (!creditsEnabled()) return { error: "The credit economy is disabled on this instance." };

  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const active = await getActiveBand();
  if (!active) return { error: "No active band" };

  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "Enter a code" };

  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) return { error: "Invalid code" };
  if (coupon.kind === "FREE_CREDITS") {
    return { error: "This code grants free credits — redeem it directly." };
  }
  if (isExpired(coupon.expiresAt)) return { error: "This code has expired" };
  if (isExhausted(coupon.maxRedemptions, coupon.redemptionCount)) {
    return { error: "This code has reached its redemption limit" };
  }

  // Blocked if EITHER this band or this user (regardless of which band
  // they're currently acting as) has already used this coupon.
  const alreadyUsed = await prisma.couponRedemption.findFirst({
    where: { couponId: coupon.id, OR: [{ bandId: active.band.id }, { userId: user.id }] },
  });
  if (alreadyUsed) return { error: "You've already used this code" };

  return {
    ok: true,
    kind: coupon.kind as "PERCENT_OFF" | "FIXED_OFF",
    amount: coupon.amount,
    code: coupon.code,
  };
}

export type ApplyCouponResult =
  | { ok: true; kind: "FREE_CREDITS"; credits: number }
  | { ok: true; kind: "PERCENT_OFF" | "FIXED_OFF"; amount: number; code: string }
  | { error: string };

/**
 * Single entry point for the "Have a code?" input: redeems FREE_CREDITS codes
 * immediately, or validates+previews a discount code for the client to hold
 * onto until they click Buy.
 */
export async function applyCoupon(code: string): Promise<ApplyCouponResult> {
  const normalized = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
  if (coupon?.kind === "FREE_CREDITS") return redeemCoupon(code);
  return validateCoupon(code);
}

function generateCode(): string {
  // 8 chars, unambiguous alphabet (no 0/O, 1/I/L) — easy to read aloud/type.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

/** Create a new coupon. Admin-only. */
export async function createCoupon(input: {
  code?: string;
  kind: CouponKind;
  amount: number;
  maxRedemptions?: number | null;
  expiresAt?: string | null; // ISO date string from a date input
}): Promise<{ ok: true; code: string } | { error: string }> {
  if (!(await isCurrentUserAdmin())) return { error: "Unauthorized" };

  if (!KINDS.includes(input.kind)) return { error: "Invalid kind" };
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { error: "Amount must be a positive whole number" };
  }
  if (input.kind === "PERCENT_OFF" && input.amount > 100) {
    return { error: "Percent off can't exceed 100" };
  }
  if (
    input.maxRedemptions !== undefined &&
    input.maxRedemptions !== null &&
    (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions <= 0)
  ) {
    return { error: "Max redemptions must be a positive whole number" };
  }

  const code = (input.code?.trim() || generateCode()).toUpperCase();

  try {
    await prisma.coupon.create({
      data: {
        code,
        kind: input.kind,
        amount: input.amount,
        maxRedemptions: input.maxRedemptions ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") return { error: "That code already exists" };
    throw err;
  }

  revalidatePath("/admin/coupons");
  return { ok: true, code };
}

/** Enable or disable a coupon. Admin-only. Coupons are never hard-deleted. */
export async function setCouponActive(
  couponId: string,
  active: boolean,
): Promise<{ ok: true } | { error: string }> {
  if (!(await isCurrentUserAdmin())) return { error: "Unauthorized" };

  await prisma.coupon.update({ where: { id: couponId }, data: { active } });
  revalidatePath("/admin/coupons");
  return { ok: true };
}
