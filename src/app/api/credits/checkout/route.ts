import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireVerifiedUser, gateResponse } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";
import {
  getPackage,
  creditsEnabled,
  discountedPriceCents,
  isChargeable,
  formatUsd,
  STRIPE_MIN_CHARGE_CENTS,
  type DiscountKind,
} from "@/lib/credits";
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

  const gate = await requireVerifiedUser();
  if (!gate.ok) return gateResponse(gate);
  const user = gate.user;

  // Credits are purchased for the band the user is currently acting as.
  const active = await getActiveBand();
  if (!active) return NextResponse.json({ error: "No active band" }, { status: 400 });

  const { packageId, couponCode } = (await req.json().catch(() => ({}))) as {
    packageId?: string;
    couponCode?: string;
  };
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
        // Shared with the buy page's preview (discountedPriceCents) so the
        // charged price can never drift from the displayed one.
        const discounted = discountedPriceCents(
          coupon.kind as DiscountKind,
          coupon.amount,
          pack.priceCents,
        );
        // Stripe rejects charges under $0.50 — a deep discount on a small
        // pack lands here. 400 (not the silent-ignore above): the buyer is
        // looking at a discounted price, so silently charging full price
        // would be worse than an error.
        if (!isChargeable(discounted)) {
          return NextResponse.json(
            {
              error: `This code can't be applied to the ${pack.label} pack — the discounted total would be below Stripe's ${formatUsd(
                STRIPE_MIN_CHARGE_CENTS,
              )} minimum. Try a larger pack.`,
            },
            { status: 400 },
          );
        }
        couponId = coupon.id;
        unitAmount = discounted;
      }
    }
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
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
      },
      {
        // Application-level dedupe (double-click, two tabs): identical
        // requests within the same minute reuse one Checkout session, while a
        // deliberate second purchase a minute later gets a fresh one.
        // (stripe-node handles its own network-retry idempotency.)
        idempotencyKey: `credits:${active.band.id}:${user.id}:${pack.id}:${couponId ?? "none"}:${Math.floor(Date.now() / 60000)}`,
      },
    );
  } catch (err) {
    // Stripe rejecting the session (bad params, amount edge cases) is a 400
    // we should own, not an unhandled 500.
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      console.error("[credits/checkout] Stripe rejected session create", err.message);
      return NextResponse.json(
        { error: "Payment could not be started. Please try again." },
        { status: 400 },
      );
    }
    throw err;
  }

  return NextResponse.json({ url: session.url });
}
