import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { livemodeMatches, planFromEvent } from "./stripe-webhook";

// planFromEvent is the money-deciding layer of the webhook: given a verified
// Stripe event, does it grant credits, record a tip, sync a Connect account,
// or get ignored — and with what numbers? A wrong plan here is a wrong ledger
// entry for a real payment, so every branch is pinned.
//
// LIMIT OF THIS FILE: vitest runs on Node, so the signature tests below
// exercise stripe-node's Node crypto provider only — NOT the workerd
// (SubtleCrypto) build the production Worker may resolve. The sync-vs-async
// constructEvent hazard is structurally invisible here; `npm run preview`
// (real workerd) plus the Stripe CLI e2e are the steps that cover it.

function checkoutEvent(opts: {
  metadata?: Record<string, string>;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  sessionId?: string;
  livemode?: boolean;
}): Stripe.Event {
  return {
    id: "evt_test_1",
    type: "checkout.session.completed",
    created: 1_754_000_000,
    livemode: opts.livemode ?? false,
    data: {
      object: {
        id: opts.sessionId ?? "cs_test_1",
        object: "checkout.session",
        metadata: opts.metadata ?? {},
        payment_status: opts.payment_status ?? "paid",
        amount_total: opts.amount_total === undefined ? 150 : opts.amount_total,
        currency: opts.currency === undefined ? "usd" : opts.currency,
      },
    },
  } as unknown as Stripe.Event;
}

function accountEvent(opts: {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created?: number;
  accountId?: string;
}): Stripe.Event {
  return {
    id: "evt_test_acct",
    type: "account.updated",
    created: opts.created ?? 1_754_000_000,
    livemode: false,
    data: {
      object: {
        id: opts.accountId ?? "acct_test_1",
        object: "account",
        charges_enabled: opts.charges_enabled,
        payouts_enabled: opts.payouts_enabled,
      },
    },
  } as unknown as Stripe.Event;
}

describe("planFromEvent — credit purchases", () => {
  it("plans a credit grant with the amount actually paid", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: { bandId: "band1", packageId: "starter", credits: "150" },
        amount_total: 75, // 50%-off coupon: 150 credits for 75¢
        sessionId: "cs_abc",
      }),
    );
    expect(plan).toEqual({
      kind: "credits",
      bandId: "band1",
      credits: 150,
      sessionId: "cs_abc",
      amountPaidCents: 75,
      couponId: null,
      couponUserId: null,
    });
  });

  it("carries coupon metadata when present", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: { bandId: "band1", credits: "500", couponId: "coup1", userId: "user1" },
      }),
    );
    expect(plan).toMatchObject({ kind: "credits", couponId: "coup1", couponUserId: "user1" });
  });

  it("ignores an unpaid session", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: { bandId: "band1", credits: "150" },
        payment_status: "unpaid",
      }),
    );
    expect(plan.kind).toBe("ignore");
  });

  it("ignores a session with no bandId", () => {
    const plan = planFromEvent(checkoutEvent({ metadata: { credits: "150" } }));
    expect(plan.kind).toBe("ignore");
  });

  // Pins the NaN-falls-through behaviour `credits > 0` relies on. Malformed
  // metadata must never grant credits.
  it.each([
    ["missing", {}],
    ["zero", { credits: "0" }],
    ["negative", { credits: "-5" }],
    ["garbage", { credits: "abc" }],
  ])("ignores a session whose credits metadata is %s", (_label, extra) => {
    const plan = planFromEvent(
      checkoutEvent({ metadata: { bandId: "band1", ...extra } }),
    );
    expect(plan.kind).toBe("ignore");
  });

  // docs/tipping.md says credit and tip metadata never overlap; only checkout
  // discipline makes that true. If they ever DO overlap, the resolution must
  // be deterministic — credits first — not dependent on branch order drift.
  it("resolves a session carrying BOTH credits and tip metadata to credits", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: {
          bandId: "band1",
          credits: "150",
          kind: "tip",
          amountCents: "500",
        },
      }),
    );
    expect(plan.kind).toBe("credits");
  });
});

describe("planFromEvent — tips", () => {
  it("plans a tip receipt with the split from metadata", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: {
          bandId: "band1",
          kind: "tip",
          tipperUserId: "user2",
          projectId: "proj1",
          amountCents: "500",
          feeCents: "50",
          artistCents: "450",
        },
        currency: "usd",
        sessionId: "cs_tip",
      }),
    );
    expect(plan).toEqual({
      kind: "tip",
      bandId: "band1",
      sessionId: "cs_tip",
      tipperUserId: "user2",
      projectId: "proj1",
      amountCents: 500,
      feeCents: 50,
      artistCents: 450,
      currency: "usd",
    });
  });

  it("defaults currency to usd when the session has none", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: { bandId: "band1", kind: "tip", amountCents: "500" },
        currency: null,
      }),
    );
    expect(plan).toMatchObject({ kind: "tip", currency: "usd" });
  });

  it("nulls empty-string tipper/project ids", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: {
          bandId: "band1",
          kind: "tip",
          tipperUserId: "",
          projectId: "",
          amountCents: "500",
        },
      }),
    );
    expect(plan).toMatchObject({ kind: "tip", tipperUserId: null, projectId: null });
  });

  it("ignores an unpaid tip session", () => {
    const plan = planFromEvent(
      checkoutEvent({
        metadata: { bandId: "band1", kind: "tip", amountCents: "500" },
        payment_status: "unpaid",
      }),
    );
    expect(plan.kind).toBe("ignore");
  });
});

describe("planFromEvent — account.updated", () => {
  // payoutsEnabled requires BOTH charges and payouts — all four combinations.
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])(
    "charges_enabled=%s payouts_enabled=%s → payoutsEnabled=%s",
    (charges, payouts, expected) => {
      const plan = planFromEvent(
        accountEvent({ charges_enabled: charges, payouts_enabled: payouts }),
      );
      expect(plan).toMatchObject({ kind: "account", payoutsEnabled: expected });
    },
  );

  it("derives syncedAt from event.created (seconds → Date)", () => {
    const plan = planFromEvent(
      accountEvent({ charges_enabled: true, payouts_enabled: true, created: 1_754_000_123 }),
    );
    expect(plan).toMatchObject({
      kind: "account",
      accountId: "acct_test_1",
      syncedAt: new Date(1_754_000_123_000),
    });
  });
});

describe("planFromEvent — everything else", () => {
  it("ignores unhandled event types", () => {
    const event = {
      id: "evt_x",
      type: "charge.refunded",
      created: 1,
      livemode: false,
      data: { object: {} },
    } as unknown as Stripe.Event;
    const plan = planFromEvent(event);
    expect(plan.kind).toBe("ignore");
  });
});

describe("livemodeMatches", () => {
  const testEvent = checkoutEvent({ metadata: {}, livemode: false });
  const liveEvent = checkoutEvent({ metadata: {}, livemode: true });

  it.each([
    ["live key + live event", liveEvent, "live", true],
    ["live key + test event", testEvent, "live", false],
    ["test key + test event", testEvent, "test", true],
    ["test key + live event", liveEvent, "test", false],
  ] as const)("%s → %s", (_label, event, mode, expected) => {
    expect(livemodeMatches(event, mode)).toBe(expected);
  });

  it("never matches an unknown key mode", () => {
    expect(livemodeMatches(testEvent, "unknown")).toBe(false);
    expect(livemodeMatches(liveEvent, "unknown")).toBe(false);
  });
});

// Signature verification — the layer in front of planFromEvent. Uses the SDK's
// own test-header helper, so this asserts our verify call is wired correctly
// (async variant, right error type), not Stripe's HMAC math.
describe("webhook signature verification (Node crypto provider)", () => {
  const client = new Stripe("sk_test_dummy", { apiVersion: "2026-05-27.dahlia" });
  const secret = "whsec_test_secret";
  const payload = JSON.stringify(
    checkoutEvent({ metadata: { bandId: "band1", credits: "150" } }),
  );

  it("accepts a correctly signed payload", async () => {
    const header = client.webhooks.generateTestHeaderString({ payload, secret });
    const event = await client.webhooks.constructEventAsync(payload, header, secret);
    expect(event.type).toBe("checkout.session.completed");
  });

  it("rejects a tampered payload with StripeSignatureVerificationError", async () => {
    const header = client.webhooks.generateTestHeaderString({ payload, secret });
    await expect(
      client.webhooks.constructEventAsync(payload.replace("150", "9999"), header, secret),
    ).rejects.toBeInstanceOf(Stripe.errors.StripeSignatureVerificationError);
  });

  it("rejects a signature from the wrong secret", async () => {
    const header = client.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_other",
    });
    await expect(
      client.webhooks.constructEventAsync(payload, header, secret),
    ).rejects.toBeInstanceOf(Stripe.errors.StripeSignatureVerificationError);
  });

  it("rejects a stale timestamp outside the tolerance window", async () => {
    const header = client.webhooks.generateTestHeaderString({
      payload,
      secret,
      timestamp: Math.floor(Date.now() / 1000) - 600, // default tolerance is 300s
    });
    await expect(
      client.webhooks.constructEventAsync(payload, header, secret),
    ).rejects.toBeInstanceOf(Stripe.errors.StripeSignatureVerificationError);
  });
});
