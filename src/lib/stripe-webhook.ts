import type Stripe from "stripe";
import type { StripeMode } from "@/lib/stripe";

/**
 * Pure decision layer for the Stripe webhook: event in, plan out. No DB, no
 * env, no I/O — so the branch logic that decides whether money-shaped events
 * grant credits, record tips, or get ignored is unit-testable without Prisma.
 * The route (src/app/api/credits/webhook/route.ts) verifies the signature,
 * derives a plan here, and executes it.
 */

export type WebhookPlan =
  | { kind: "ignore"; reason: string }
  | {
      kind: "credits";
      bandId: string;
      credits: number;
      sessionId: string;
      /** What the buyer actually paid (post-coupon), from session.amount_total. */
      amountPaidCents: number | null;
      couponId: string | null;
      couponUserId: string | null;
    }
  | {
      kind: "tip";
      bandId: string;
      sessionId: string;
      tipperUserId: string | null;
      projectId: string | null;
      amountCents: number;
      feeCents: number;
      artistCents: number;
      currency: string;
    }
  | {
      kind: "account";
      accountId: string;
      payoutsEnabled: boolean;
      /** event.created (1-second resolution) — the monotonic ordering key. */
      syncedAt: Date;
    };

/**
 * True when the event's livemode matches the configured key's mode. An
 * "unknown" key mode never matches — the route should have 503'd before
 * calling this, but a pure function shouldn't guess.
 */
export function livemodeMatches(event: Stripe.Event, mode: StripeMode): boolean {
  if (mode === "live") return event.livemode === true;
  if (mode === "test") return event.livemode === false;
  return false;
}

export function planFromEvent(event: Stripe.Event): WebhookPlan {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    const bandId = meta.bandId;
    // Number("abc") is NaN and NaN > 0 is false, so malformed metadata falls
    // through to ignore — pinned by tests, don't "fix" to a throw.
    const credits = Number(meta.credits ?? 0);

    if (!bandId) return { kind: "ignore", reason: "no bandId in metadata" };
    if (session.payment_status !== "paid") {
      return { kind: "ignore", reason: `payment_status=${session.payment_status}` };
    }

    // Credits wins if both branches somehow match — checkout metadata
    // discipline keeps them disjoint (docs/tipping.md), and this ordering
    // makes the resolution deterministic if they ever aren't.
    if (credits > 0) {
      return {
        kind: "credits",
        bandId,
        credits,
        sessionId: session.id,
        amountPaidCents: session.amount_total,
        couponId: meta.couponId ?? null,
        couponUserId: meta.userId ?? null,
      };
    }

    if (meta.kind === "tip") {
      return {
        kind: "tip",
        bandId,
        sessionId: session.id,
        tipperUserId: meta.tipperUserId || null,
        projectId: meta.projectId || null,
        amountCents: Number(meta.amountCents ?? 0),
        feeCents: Number(meta.feeCents ?? 0),
        artistCents: Number(meta.artistCents ?? 0),
        currency: session.currency ?? "usd",
      };
    }

    return { kind: "ignore", reason: "session is neither a credit purchase nor a tip" };
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    return {
      kind: "account",
      accountId: account.id,
      payoutsEnabled: Boolean(account.charges_enabled && account.payouts_enabled),
      syncedAt: new Date(event.created * 1000),
    };
  }

  return { kind: "ignore", reason: `unhandled event type ${event.type}` };
}
