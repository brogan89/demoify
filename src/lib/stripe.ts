import Stripe from "stripe";

/** True when Stripe credentials are present (payments enabled). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Which Stripe environment the configured key belongs to. Three-state on
 * purpose: restricted keys are rk_live_/rk_test_ (a boolean startsWith
 * "sk_live_" would misclassify a restricted live key as test and make the
 * webhook reject every real event), and an unrecognised prefix is a config
 * error — the webhook 503s on "unknown" rather than guessing.
 */
export type StripeMode = "live" | "test" | "unknown";

export function stripeMode(): StripeMode {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  return "unknown";
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY to enable payments.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pin the API version so `npm update stripe` can't silently change the
      // request/response contract. This pins OUTBOUND calls only — webhook
      // payload shape is set by the endpoint's version in the Stripe
      // dashboard, which must be pinned to the same value (see DEPLOYMENT.md).
      apiVersion: "2026-05-27.dahlia",
      // Force the fetch-based HTTP client. stripe-node's `exports` map routes
      // the `workerd` condition to a build whose sync crypto provider throws;
      // today's bundle happens to resolve the Node build (working only via
      // nodejs_compat), and this keeps runtime behaviour independent of which
      // build the bundler picks.
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return client;
}

export function appUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}
