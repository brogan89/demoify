/**
 * Stripe revenue analytics integration.
 *
 * Queries Stripe's API for real revenue data to complement our local ledger.
 * Requires STRIPE_SECRET_KEY to be set.
 *
 * The local credit_transaction + tip tables are our source of truth for the
 * dashboard, but this module provides Stripe-verified numbers for audit and
 * reconciliation.
 */
import { stripe, isStripeConfigured } from "@/lib/stripe";

export type StripeRevenueSummary = {
  /** Revenue from credit purchases (last 30 days), in cents. */
  creditPurchaseRevenue30d: number;
  /** Revenue from credit purchases (current month), in cents. */
  creditPurchaseRevenueMonth: number;
  /** Total Stripe charges (last 30 days), in cents. */
  totalCharges30d: number;
  /** Total Stripe charges (current month), in cents. */
  totalChargesMonth: number;
  /** Number of successful charges (last 30 days). */
  chargeCount30d: number;
  /** Stripe Connect transfers (tips) volume, in cents. */
  tipTransferVolume30d: number;
  /** Active subscriptions (future: when subscriptions are implemented). */
  activeSubscriptions: number;
  /** Pending payout balance, in cents. */
  pendingBalanceCents: number;
  /** Available balance, in cents. */
  availableBalanceCents: number;
};

/**
 * Fetch revenue data from Stripe directly.
 * Returns null if Stripe is not configured.
 */
export async function getStripeRevenue(): Promise<StripeRevenueSummary | null> {
  if (!isStripeConfigured()) return null;

  const s = stripe();
  const now = new Date();
  const days30Ago = new Date(now.getTime() - 30 * 86400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [
      charges30d,
      chargesMonth,
      transfers30d,
      balance,
    ] = await Promise.all([
      // Charges in last 30 days
      s.charges.list({
        created: { gte: Math.floor(days30Ago.getTime() / 1000) },
        limit: 100,
      }),
      // Charges this month
      s.charges.list({
        created: { gte: Math.floor(monthStart.getTime() / 1000) },
        limit: 100,
      }),
      // Connect transfers (tips) in last 30 days
      s.transfers.list({
        created: { gte: Math.floor(days30Ago.getTime() / 1000) },
        limit: 100,
      }),
      // Account balance
      s.balance.retrieve(),
    ]);

    const charge30dTotal = charges30d.data.reduce((s, c) => s + (c.amount - c.amount_refunded), 0);
    const chargeMonthTotal = chargesMonth.data.reduce((s, c) => s + (c.amount - c.amount_refunded), 0);
    const transferVolume30d = transfers30d.data.reduce((s, t) => s + t.amount, 0);

    // Subscription count (for future subscription tiers)
    // This queries for "active" subscriptions — will be populated once subscriptions are launched
    let activeSubs = 0;
    try {
      const subs = await s.subscriptions.list({ limit: 1, status: "active" });
      activeSubs = subs.data.length > 0 ? subs.data.length : 0;
    } catch {
      // subscriptions API may not be used yet
    }

    const pendingBalanceCents = balance.pending?.reduce((s, b) => s + b.amount, 0) ?? 0;
    const availableBalanceCents = balance.available?.reduce((s, b) => s + b.amount, 0) ?? 0;

    return {
      creditPurchaseRevenue30d: charge30dTotal,
      creditPurchaseRevenueMonth: chargeMonthTotal,
      totalCharges30d: charge30dTotal,
      totalChargesMonth: chargeMonthTotal,
      chargeCount30d: charges30d.data.length,
      tipTransferVolume30d: transferVolume30d,
      activeSubscriptions: activeSubs,
      pendingBalanceCents,
      availableBalanceCents,
    };
  } catch (err) {
    console.error("Stripe revenue query failed:", err);
    return null;
  }
}
