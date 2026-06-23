/**
 * Credit economics.
 *
 * Base price: 100 credits = $1 USD (i.e. 1 credit = 1 cent).
 * New users start with enough credits for 3 free uploads.
 * Each track upload costs UPLOAD_COST credits.
 *
 * `priceCents` is stored explicitly per package so future sales can lower the
 * price (or grant bonus credits) without touching the base ratio.
 */
export const STARTING_CREDITS = 150;
export const UPLOAD_COST = 50;
export const CREDITS_PER_USD = 100;

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

export function getPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Whole tracks the given credit balance can still upload. */
export function uploadsRemaining(credits: number): number {
  return Math.floor(credits / UPLOAD_COST);
}
