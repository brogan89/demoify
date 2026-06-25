import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
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

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const account = await stripe().accounts.create({
      type: "express",
      metadata: { bandId: band.id },
    });
    accountId = account.id;
    await prisma.band.update({
      where: { id: band.id },
      data: { stripeAccountId: accountId },
    });
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/dashboard/payouts?refresh=1`,
    return_url: `${appUrl()}/dashboard/payouts?return=1`,
  });

  return NextResponse.json({ url: link.url });
}
