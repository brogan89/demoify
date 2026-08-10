import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/db";
import { isStripeConfigured, stripe, stripeMode } from "@/lib/stripe";
import { planFromEvent, livemodeMatches } from "@/lib/stripe-webhook";

// The one Stripe entry point: credit purchases, tip receipts, and Connect
// account status all arrive here.
//
// Deliberately NOT session-gated and NOT in scripts/check-write-gates.mjs's
// ROUTES map — Stripe authenticates by HMAC signature, not by session, and
// every DB access happens strictly after verification. Also deliberately NOT
// behind creditsEnabled(): flipping CREDITS_ENABLED off is the payments
// rollback, and in-flight Checkout sessions must still fulfil afterwards.
//
// D1 note: Prisma's $transaction is NOT atomic on D1 (the adapter runs the
// statements individually — see @prisma/adapter-d1's startTransaction
// warning). So the credits branch is claim-first + compensate, mirroring
// src/app/actions/versions.ts: the unique stripeSessionId insert is the
// idempotency claim, and a failed grant deletes the claim so Stripe's retry
// can redo the work.
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (stripeMode() === "unknown") {
    // Unrecognised key prefix is a config error — refuse rather than guess
    // which environment's events to trust.
    console.error("[stripe-webhook] STRIPE_SECRET_KEY has an unrecognised prefix");
    return NextResponse.json({ error: "Stripe key misconfigured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  // Stripe needs the raw request body to verify the signature.
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    // Async variant on purpose: it works with both the Node and the workerd
    // (SubtleCrypto) builds of stripe-node; the sync constructEvent throws on
    // the latter.
    event = await stripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      // 400: Stripe does not retry 4xx, which is right — a bad signature
      // never becomes good.
      console.warn("[stripe-webhook] signature verification failed", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    // Anything else (crypto provider failure, malformed header, …) is our
    // problem, not Stripe's — 500 so Stripe retries and the failure is
    // visible in Workers Logs and the endpoint's failed-delivery list.
    console.error("[stripe-webhook] verification error", err);
    return NextResponse.json({ error: "Verification error" }, { status: 500 });
  }

  // A test event on a live key (or vice versa) is a configuration accident —
  // e.g. a stale `stripe listen` pointed at production. 200, not 4xx/5xx:
  // a mismatch never becomes a match, and 5xx would make Stripe retry for
  // days and eventually disable the endpoint.
  if (!livemodeMatches(event, stripeMode())) {
    console.warn(
      `[stripe-webhook] ignoring ${event.type} ${event.id}: livemode=${event.livemode} but key mode=${stripeMode()}`,
    );
    return NextResponse.json({ ignored: "livemode_mismatch" });
  }

  const plan = planFromEvent(event);

  try {
    if (plan.kind === "credits") {
      // 1. Claim — the unique stripeSessionId is the idempotency key. A
      //    replayed event hits P2002 here and the whole delivery is a no-op.
      try {
        await prisma.creditTransaction.create({
          data: {
            bandId: plan.bandId,
            delta: plan.credits,
            reason: "purchase",
            stripeSessionId: plan.sessionId,
            amountPaidCents: plan.amountPaidCents,
          },
        });
      } catch (err) {
        if ((err as { code?: string }).code === "P2002") {
          return NextResponse.json({ received: true, replay: true });
        }
        throw err;
      }

      // 2. Grant. On failure, delete the claim before rethrowing so the
      //    Stripe retry can redo the work instead of P2002-ing into a false
      //    success (the buyer paid — losing this write loses their credits).
      try {
        await prisma.band.update({
          where: { id: plan.bandId },
          data: { credits: { increment: plan.credits } },
        });
      } catch (err) {
        await prisma.creditTransaction
          .delete({ where: { stripeSessionId: plan.sessionId } })
          .catch((cleanupErr) => {
            // Claim stranded: ledger row exists but credits weren't granted.
            // Loud log — the reconcile query keys off exactly this state.
            console.error(
              `[stripe-webhook] STRANDED claim for session ${plan.sessionId} — paid but uncredited`,
              cleanupErr,
            );
          });
        throw err;
      }

      // 3. Coupon bookkeeping — after the money moved, this must never fail
      //    the handler (a 500 here would make Stripe replay a granted
      //    purchase). P2002 = replay-safe duplicate; anything else is logged.
      if (plan.couponId) {
        try {
          await prisma.couponRedemption.create({
            data: { couponId: plan.couponId, bandId: plan.bandId, userId: plan.couponUserId },
          });
          await prisma.coupon.update({
            where: { id: plan.couponId },
            data: { redemptionCount: { increment: 1 } },
          });
        } catch (err) {
          if ((err as { code?: string }).code !== "P2002") {
            console.error("[stripe-webhook] coupon bookkeeping failed", err);
          }
        }
      }
    } else if (plan.kind === "tip") {
      // Stripe already split + transferred the money via the destination
      // charge; we just record the receipt. Idempotent on stripeSessionId.
      try {
        await prisma.tip.create({
          data: {
            bandId: plan.bandId,
            tipperUserId: plan.tipperUserId,
            projectId: plan.projectId,
            amountCents: plan.amountCents,
            feeCents: plan.feeCents,
            artistCents: plan.artistCents,
            currency: plan.currency,
            status: "paid",
            stripeSessionId: plan.sessionId,
          },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    } else if (plan.kind === "account") {
      // Monotonic conditional update: only apply if this event is newer than
      // the last one applied. Stripe doesn't guarantee delivery order, so an
      // unguarded write would let a retried older event flip a working
      // artist's payouts back off. event.created is 1-second resolution — a
      // replay carries an equal timestamp and fails the `lt` test (no-op);
      // two genuine changes in the same second re-converge on the next event.
      await prisma.band.updateMany({
        where: {
          stripeAccountId: plan.accountId,
          OR: [{ payoutsSyncedAt: null }, { payoutsSyncedAt: { lt: plan.syncedAt } }],
        },
        data: { payoutsEnabled: plan.payoutsEnabled, payoutsSyncedAt: plan.syncedAt },
      });
    }
    // plan.kind === "ignore" falls through to the 200 below.
  } catch (err) {
    // 500 so Stripe retries — the claim/compensate structure above makes a
    // retry safe for every branch.
    console.error(`[stripe-webhook] failed handling ${event.type} ${event.id}`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
