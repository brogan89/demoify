import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";
import { getPackage, creditsEnabled } from "@/lib/credits";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  if (!creditsEnabled()) {
    return NextResponse.json(
      { error: "The credit economy is disabled on this instance." },
      { status: 503 },
    );
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Credits are purchased for the band the user is currently acting as.
  const active = await getActiveBand();
  if (!active) return NextResponse.json({ error: "No active band" }, { status: 400 });

  const { packageId, couponCode } = await req.json().catch(() => ({}));
  const pack = getPackage(packageId);
  if (!pack) return NextResponse.json({ error: "Unknown package" }, { status: 400 });

  // Optional discount coupon — re-validated server-side (never trust the
  // client's earlier validateCoupon call). An invalid/expired/exhausted/
  // already-used code is silently ignored (full price charged) rather than
  // erroring the whole checkout — the client should only ever send a code
  // that passed validateCoupon, so this is just a safety net.
  let unitAmount = pack.priceCents;
  let couponId: string | null = null;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: String(couponCode).trim().toUpperCase() },
    });
    const valid =
      coupon &&
      coupon.active &&
      coupon.kind !== "FREE_CREDITS" &&
      (!coupon.expiresAt || coupon.expiresAt >= new Date()) &&
      (coupon.maxRedemptions === null || coupon.redemptionCount < coupon.maxRedemptions);
    if (valid) {
      // Blocked if EITHER this band or this user (regardless of which band
      // they're currently acting as) has already redeemed this coupon.
      const alreadyUsed = await prisma.couponRedemption.findFirst({
        where: { couponId: coupon.id, OR: [{ bandId: active.band.id }, { userId: user.id }] },
      });
      if (!alreadyUsed) {
        couponId = coupon.id;
        const discountCents =
          coupon.kind === "PERCENT_OFF"
            ? Math.round((pack.priceCents * coupon.amount) / 100)
            : coupon.amount;
        unitAmount = Math.max(0, pack.priceCents - discountCents);
      }
    }
  }

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl()}/dashboard/credits?purchase=success`,
    cancel_url: `${appUrl()}/dashboard/credits?purchase=cancelled`,
    client_reference_id: active.band.id,
    metadata: {
      bandId: active.band.id,
      packageId: pack.id,
      credits: String(pack.credits),
      // userId travels with couponId so the webhook can record who redeemed
      // it (no session context there) — see CouponRedemption's per-user guard.
      ...(couponId ? { couponId, userId: user.id } : {}),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: { name: `${pack.credits} Demoify credits (${pack.label})` },
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
