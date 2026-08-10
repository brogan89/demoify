import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireVerifiedUser, gateResponse } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";

// Starts (or resumes) Stripe Connect onboarding for the active band so it can
// receive tips. Creates an Express account on first use, stores its id on the
// band, then returns a one-time hosted onboarding link to redirect the user to.
export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured. Set STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  // No `gate.user` binding needed — the band, not the user, owns the payout
  // account, and getActiveBand() re-resolves membership on its own.
  const gate = await requireVerifiedUser();
  if (!gate.ok) return gateResponse(gate);

  // Payouts are set up for the band the user is currently acting as.
  const active = await getActiveBand();
  if (!active) return NextResponse.json({ error: "No active band" }, { status: 400 });

  const band = await prisma.band.findUnique({
    where: { id: active.band.id },
    select: { id: true, stripeAccountId: true },
  });
  if (!band) return NextResponse.json({ error: "No active band" }, { status: 400 });

  let accountId = band.stripeAccountId;
  if (!accountId) {
    // Three layers against the create-account race (double-click, two tabs):
    // 1. The idempotency key — concurrent identical requests get ONE Stripe
    //    account back, so no orphan account is ever created. No time bucket:
    //    the key should hold for the whole un-onboarded window (Stripe keys
    //    live 24h, ample for a retry storm).
    // 2. The conditional claim below — only the first writer sets the id;
    //    a loser re-reads and uses the stored one.
    // 3. The unique index on band.stripeAccountId (migration 0019).
    let account: Stripe.Account;
    try {
      account = await stripe().accounts.create(
        {
          type: "express",
          metadata: { bandId: band.id },
        },
        { idempotencyKey: `connect-account:${band.id}` },
      );
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError) {
        console.error("[connect/onboard] Stripe rejected account create", err.message);
        return NextResponse.json(
          { error: "Payout setup could not be started. Please try again." },
          { status: 400 },
        );
      }
      throw err;
    }
    // Claim the slot only if still empty — check-then-act is racy on its own.
    const claimed = await prisma.band.updateMany({
      where: { id: band.id, stripeAccountId: null },
      data: { stripeAccountId: account.id },
    });
    if (claimed.count === 0) {
      // Lost the race — another request already stored an id. Use that one.
      // (With the idempotency key both requests usually hold the SAME id
      // anyway; this handles the general case.)
      const current = await prisma.band.findUnique({
        where: { id: band.id },
        select: { stripeAccountId: true },
      });
      accountId = current?.stripeAccountId ?? account.id;
    } else {
      accountId = account.id;
    }
  }

  // No idempotency key here, deliberately: account links are single-use and
  // expire in minutes. Reusing a key within Stripe's 24h replay window would
  // hand back a dead link and the artist could never finish onboarding.
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/dashboard/payouts?refresh=1`,
    return_url: `${appUrl()}/dashboard/payouts?return=1`,
  });

  return NextResponse.json({ url: link.url });
}
