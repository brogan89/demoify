/**
 * Tipping economics.
 *
 * Tips are real money (USD), paid via Stripe Connect. The platform takes a 10%
 * application fee; the remaining 90% transfers straight to the artist's
 * connected account. Amounts are handled in cents end-to-end.
 */
export const PLATFORM_FEE_PERCENT = 10;

/** Quick-pick tip amounts shown as buttons (in cents): $2 / $5 / $10. */
export const TIP_PRESETS_CENTS = [200, 500, 1000];

/** Bounds for a single tip: $1 minimum, $500 maximum. */
export const MIN_TIP_CENTS = 100;
export const MAX_TIP_CENTS = 50000;

/** Split a gross tip into the platform fee (10%) and the artist's share (90%). */
export function splitTip(amountCents: number): { feeCents: number; artistCents: number } {
  const feeCents = Math.round((amountCents * PLATFORM_FEE_PERCENT) / 100);
  return { feeCents, artistCents: amountCents - feeCents };
}

/** True when the amount is a whole number of cents within the allowed bounds. */
export function isValidTipAmount(amountCents: number): boolean {
  return (
    Number.isInteger(amountCents) &&
    amountCents >= MIN_TIP_CENTS &&
    amountCents <= MAX_TIP_CENTS
  );
}
