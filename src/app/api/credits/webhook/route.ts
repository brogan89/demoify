import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { isStripeConfigured, stripe } from "@/lib/stripe";

// Stripe needs the raw request body to verify the signature.
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bandId = session.metadata?.bandId;
    const credits = Number(session.metadata?.credits ?? 0);

    if (bandId && credits > 0 && session.payment_status === "paid") {
      // Idempotent: the unique stripeSessionId means a replayed event is a no-op.
      try {
        await prisma.$transaction([
          prisma.creditTransaction.create({
            data: {
              bandId,
              delta: credits,
              reason: "purchase",
              stripeSessionId: session.id,
            },
          }),
          prisma.band.update({
            where: { id: bandId },
            data: { credits: { increment: credits } },
          }),
        ]);
      } catch (err) {
        // P2002 = unique violation on stripeSessionId = already processed (replay).
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    }
  }

  return NextResponse.json({ received: true });
}
