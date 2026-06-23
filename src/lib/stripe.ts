import Stripe from "stripe";

/** True when Stripe credentials are present (payments enabled). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured — set STRIPE_SECRET_KEY to enable payments.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}

export function appUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}
