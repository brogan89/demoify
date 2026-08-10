/**
 * Credit economics.
 *
 * Base price: 100 credits = $1 USD (i.e. 1 credit = 1 cent).
 * New users start with enough credits for 10 free uploads.
 * Each track upload costs UPLOAD_COST credits.
 *
 * Credits can also be earned by engaging with other bands' songs (see
 * ENGAGEMENT_CREDITS), which keeps active listeners supplied with uploads.
 *
 * `priceCents` is stored explicitly per package so future sales can lower the
 * price (or grant bonus credits) without touching the base ratio.
 */
export const STARTING_CREDITS = 100;
export const UPLOAD_COST = 10;
export const CREDITS_PER_USD = 100;

/**
 * The MASTER payments switch. On by default (the hosted SaaS gates uploads
 * behind credits); self-hosters set `CREDITS_ENABLED=false` to make uploads
 * free and unlimited, since they pay for their own storage.
 *
 * When off: uploads aren't charged, engagement rewards aren't granted, credit
 * UI is hidden — and every Stripe surface is disabled too: credit checkout,
 * tip checkout, Connect onboarding, and the payouts/tip UI. Flipping this to
 * "false" is the payments rollback. The one deliberate exception is the
 * Stripe webhook, which stays live so in-flight Checkout sessions still
 * fulfil after a rollback. (`isStripeConfigured` additionally gates every
 * Stripe call site on the key actually existing.)
 */
export function creditsEnabled(): boolean {
  return process.env.CREDITS_ENABLED !== "false";
}

// A new user's first artist gets STARTING_CREDITS (10 free uploads). Creating an
// *additional* artist is free, but it starts with just one free upload's worth.
export const NEW_ARTIST_CREDITS = UPLOAD_COST;

/**
 * Credits earned for engaging with another band's song, awarded at most once per
 * song per action (see `grantEngagementCredits`). Keys double as the ledger
 * `reason` for engagement rows.
 */
export const ENGAGEMENT_CREDITS = {
  like: 1,
  comment: 3,
  play: 2,
} as const;

export type EngagementReason = keyof typeof ENGAGEMENT_CREDITS;

/**
 * Seconds of actual listening required to earn `ENGAGEMENT_CREDITS.play`.
 * Tracked client-side by the player (seeks don't count); songs shorter than
 * this qualify by playing (nearly) to the end.
 */
export const PLAY_CREDIT_SECONDS = 30;

export type CreditPackage = {
  id: string;
  label: string;
  credits: number;
  priceCents: number;
};

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", label: "Starter", credits: 150, priceCents: 150 },
  { id: "creator", label: "Creator", credits: 500, priceCents: 500 },
  { id: "studio", label: "Studio", credits: 1500, priceCents: 1500 },
];

/**
 * Accepts `undefined` because every caller is looking up an id that came off a
 * request body, where "absent" and "unknown" both mean the same thing: no
 * package. Callers already handle the undefined return, so widening here beats
 * a guard at each call site.
 */
export function getPackage(id: string | undefined): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Stripe's minimum charge in USD. A Checkout session below this (including
 * $0.00 after a deep discount) is rejected by Stripe at session-creation
 * time, so every discount path must check `isChargeable` first. 100%-off is
 * deliberately unsupported — that's what FREE_CREDITS coupons are for (they
 * grant credits directly and never touch Stripe).
 */
export const STRIPE_MIN_CHARGE_CENTS = 50;

export type DiscountKind = "PERCENT_OFF" | "FIXED_OFF";

/**
 * The ONE implementation of discount math. The buy page preview and the
 * checkout route both use this — if they computed independently, a drift
 * would show the buyer one price and charge another.
 */
export function discountedPriceCents(
  kind: DiscountKind,
  amount: number,
  priceCents: number,
): number {
  const off = kind === "PERCENT_OFF" ? Math.round((priceCents * amount) / 100) : amount;
  return Math.max(0, priceCents - off);
}

/** True when Stripe will accept a charge of this size. */
export function isChargeable(cents: number): boolean {
  return cents >= STRIPE_MIN_CHARGE_CENTS;
}

/**
 * Which packages a discount coupon can actually be applied to — i.e. where
 * the discounted total still clears Stripe's minimum. Empty means the coupon
 * is unusable and should not be created / should be rejected at validation.
 * (Kept env-free: client components import this module.)
 */
export function packagesUsableWith(kind: DiscountKind, amount: number): CreditPackage[] {
  return CREDIT_PACKAGES.filter((p) =>
    isChargeable(discountedPriceCents(kind, amount, p.priceCents)),
  );
}

/** Whole tracks the given credit balance can still upload. */
export function uploadsRemaining(credits: number): number {
  return Math.floor(credits / UPLOAD_COST);
}
