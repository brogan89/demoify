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
    const isTip = session.metadata?.kind === "tip";

    if (bandId && credits > 0 && session.payment_status === "paid") {
      // Credit purchase. Idempotent: the unique stripeSessionId means a replayed
      // event is a no-op — that's still true with the coupon writes appended
      // below, since this whole array is one all-or-nothing transaction.
      const couponId = session.metadata?.couponId;
      const couponUserId = session.metadata?.userId ?? null;
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
          ...(couponId
            ? [
                prisma.couponRedemption.create({
                  data: { couponId, bandId, userId: couponUserId },
                }),
                prisma.coupon.update({
                  where: { id: couponId },
                  data: { redemptionCount: { increment: 1 } },
                }),
              ]
            : []),
        ]);
      } catch (err) {
        // P2002 = unique violation on stripeSessionId (replay) or on
        // (couponId, bandId)/(couponId, userId) (shouldn't happen — checkout
        // re-validates — but covered defensively). Either way, already-
        // processed = no-op.
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    } else if (bandId && isTip && session.payment_status === "paid") {
      // Tip. Stripe already split + transferred the money via the destination
      // charge; we just record the receipt. Idempotent on stripeSessionId.
      const m = session.metadata ?? {};
      try {
        await prisma.tip.create({
          data: {
            bandId,
            tipperUserId: m.tipperUserId || null,
            projectId: m.projectId || null,
            amountCents: Number(m.amountCents ?? 0),
            feeCents: Number(m.feeCents ?? 0),
            artistCents: Number(m.artistCents ?? 0),
            currency: session.currency ?? "usd",
            status: "paid",
            stripeSessionId: session.id,
          },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    }
  } else if (event.type === "account.updated") {
    // A connected artist's account changed — refresh whether it can take tips.
    const account = event.data.object as Stripe.Account;
    const enabled = Boolean(account.charges_enabled && account.payouts_enabled);
    await prisma.band.updateMany({
      where: { stripeAccountId: account.id },
      data: { payoutsEnabled: enabled },
    });
  }

  return NextResponse.json({ received: true });
}
