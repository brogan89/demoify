import { describe, expect, it, vi } from "vitest";
import { isStripeConfigured, stripe, stripeMode } from "./stripe";

// stripe.ts reads process.env per call (no import-time capture), so plain
// vi.stubEnv works — no resetModules/dynamic-import dance needed (contrast
// r2.test.ts). vitest.setup.ts scrubs STRIPE_* from the inherited env, so
// "unset" here really means unset.

describe("isStripeConfigured", () => {
  it("is false when STRIPE_SECRET_KEY is unset", () => {
    expect(isStripeConfigured()).toBe(false);
  });

  it("is true when STRIPE_SECRET_KEY is set", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    expect(isStripeConfigured()).toBe(true);
  });
});

describe("stripeMode", () => {
  // Restricted keys (rk_) are the reason this is prefix-matched, not
  // startsWith("sk_live_") — a restricted live key must classify as live or
  // the webhook's livemode guard would reject every real event.
  it.each([
    ["sk_test_abc", "test"],
    ["sk_live_abc", "live"],
    ["rk_test_abc", "test"],
    ["rk_live_abc", "live"],
  ] as const)("classifies %s as %s", (key, expected) => {
    vi.stubEnv("STRIPE_SECRET_KEY", key);
    expect(stripeMode()).toBe(expected);
  });

  // An unrecognised prefix is a config error, not "probably test" — the
  // webhook 503s on "unknown" rather than guessing which events to trust.
  it.each(["", "garbage", "pk_live_abc", "whsec_abc", "sk_liveish"])(
    "classifies %j as unknown",
    (key) => {
      vi.stubEnv("STRIPE_SECRET_KEY", key);
      expect(stripeMode()).toBe("unknown");
    },
  );

  it("is unknown when the key is unset", () => {
    expect(stripeMode()).toBe("unknown");
  });
});

describe("stripe()", () => {
  it("throws the configuration message when the key is unset", () => {
    expect(() => stripe()).toThrow(/STRIPE_SECRET_KEY/);
  });
});
