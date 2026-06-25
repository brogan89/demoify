import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, isMember } from "@/lib/band";
import { isStripeConfigured, stripe, appUrl } from "@/lib/stripe";
import { isValidTipAmount, splitTip } from "@/lib/tips";

// Creates a Stripe Checkout session for a real-money tip. Uses a destination
// charge so Stripe routes the split automatically: `application_fee_amount` (10%)
// stays with the platform and the rest transfers to the artist's connected
// account. The webhook records the Tip row on completion.
export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Payments are not configured." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    bandId,
    amountCents,
    projectId,
    returnPath,
  }: { bandId?: string; amountCents?: number; projectId?: string; returnPath?: string } =
    await req.json().catch(() => ({}));

  if (!bandId || typeof amountCents !== "number" || !isValidTipAmount(amountCents)) {
    return NextResponse.json({ error: "Invalid tip" }, { status: 400 });
  }

  const band = await prisma.band.findUnique({
    where: { id: bandId },
    select: { id: true, displayName: true, stripeAccountId: true, payoutsEnabled: true },
  });
  if (!band) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

  if (!band.stripeAccountId || !band.payoutsEnabled) {
    return NextResponse.json(
      { error: "This artist hasn't set up tipping yet." },
      { status: 400 },
    );
  }

  // No tipping your own band.
  const role = await getMembership(band.id, user.id);
  if (isMember(role)) {
    return NextResponse.json({ error: "You can't tip your own artist." }, { status: 400 });
  }

  const { feeCents, artistCents } = splitTip(amountCents);
  // Only return to in-app paths to avoid open-redirects via the success URL.
  const safeReturn = returnPath && returnPath.startsWith("/") ? returnPath : "/explore";

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    success_url: `${appUrl()}${safeReturn}?tip=success`,
    cancel_url: `${appUrl()}${safeReturn}?tip=cancelled`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: `Tip for ${band.displayName}` },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: feeCents,
      transfer_data: { destination: band.stripeAccountId },
    },
    metadata: {
      kind: "tip",
      bandId: band.id,
      tipperUserId: user.id,
      projectId: projectId ?? "",
      amountCents: String(amountCents),
      feeCents: String(feeCents),
      artistCents: String(artistCents),
    },
  });

  return NextResponse.json({ url: session.url });
}
