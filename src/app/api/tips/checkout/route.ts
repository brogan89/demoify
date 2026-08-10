import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireVerifiedUser, gateResponse } from "@/lib/session";
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

  const gate = await requireVerifiedUser();
  if (!gate.ok) return gateResponse(gate);
  const user = gate.user;

  const {
    bandId,
    amountCents,
    projectId,
    returnPath,
  } = (await req.json().catch(() => ({}))) as {
    bandId?: string;
    amountCents?: number;
    projectId?: string;
    returnPath?: string;
  };

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

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(
      {
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
      },
      {
        // Application-level dedupe (double-click). safeReturn is part of the
        // key on purpose: the same tip started from a song page vs. a profile
        // page differs only in success_url, and identical keys with different
        // params are an idempotency_error from Stripe.
        idempotencyKey: `tip:${band.id}:${user.id}:${amountCents}:${safeReturn}:${Math.floor(Date.now() / 60000)}`,
      },
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      console.error("[tips/checkout] Stripe rejected session create", err.message);
      return NextResponse.json(
        { error: "The tip could not be started. Please try again." },
        { status: 400 },
      );
    }
    throw err;
  }

  return NextResponse.json({ url: session.url });
}
