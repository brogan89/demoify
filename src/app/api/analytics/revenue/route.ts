/**
 * Revenue analytics endpoint. ADMIN-ONLY — this returns platform revenue.
 *
 * Aggregates Stripe and platform revenue data for the analytics dashboard.
 * This queries our own D1 records (credit transactions + tips) as the source
 * of truth, since we own the ledger. For full Stripe dashboard integration,
 * admins can view the Stripe Dashboard directly at dashboard.stripe.com.
 *
 * GET /api/analytics/revenue?days=30
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isCurrentUserAdmin } from "@/lib/admin";

export type RevenueData = {
  totalRevenueCents: number;
  creditRevenueCents: number;
  tipPlatformFeesCents: number;
  tipGrossCents: number;
  totalCreditPurchases: number;
  totalTips: number;
  revenueByDay: { date: string; credits: number; tips: number; total: number }[];
  revenueByPackage: { id: string; label: string; count: number; credits: number; revenue: number }[];
};

/**
 * Format a date as YYYY-MM-DD.
 */
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// A "purchase" ledger row: delta = credits granted; amountPaidCents = what the
// buyer actually paid (null for pre-0019 rows, where full price at 1cr=1¢
// makes delta the correct fallback).
type PurchaseRow = { delta: number; amountPaidCents: number | null; createdAt: Date };

function paidCents(p: PurchaseRow): number {
  return p.amountPaidCents ?? p.delta;
}

export async function GET(request: Request) {
  try {
    // 404, not 403: an unauthenticated probe shouldn't learn the endpoint
    // exists. Same gate as /admin/analytics (isCurrentUserAdmin requires a
    // verified email).
    if (!(await isCurrentUserAdmin())) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "90", 10) || 90, 1), 365);
    const since = new Date(Date.now() - days * 86400_000);

    const [purchases, tips, allPurchases] = await Promise.all([
      // Recent credit purchases
      prisma.creditTransaction.findMany({
        where: { reason: "purchase", createdAt: { gte: since } },
        select: { delta: true, amountPaidCents: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // Recent tips
      prisma.tip.findMany({
        where: { createdAt: { gte: since } },
        select: { amountCents: true, feeCents: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      // All-time purchases for package breakdown
      prisma.creditTransaction.findMany({
        where: { reason: "purchase" },
        select: { delta: true, amountPaidCents: true, createdAt: true },
      }),
    ]);

    // --- Totals ---
    // Sum what buyers PAID, not credits granted — they diverge on every
    // coupon-discounted purchase.
    const creditRevenueCents = purchases.reduce((s: number, p: PurchaseRow) => s + paidCents(p), 0);
    const tipPlatformFeesCents = tips.reduce((s: number, t: { feeCents: number }) => s + t.feeCents, 0);
    const tipGrossCents = tips.reduce((s: number, t: { amountCents: number }) => s + t.amountCents, 0);
    const totalRevenueCents = creditRevenueCents + tipPlatformFeesCents;

    // --- Revenue by day ---
    const dayBuckets = new Map<string, { credits: number; tips: number }>();
    const range: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = fmtDate(d);
      range.push(key);
      dayBuckets.set(key, { credits: 0, tips: 0 });
    }

    for (const p of purchases) {
      const key = fmtDate(p.createdAt);
      const bucket = dayBuckets.get(key);
      if (bucket) bucket.credits += paidCents(p);
    }

    for (const t of tips) {
      const key = fmtDate(t.createdAt);
      const bucket = dayBuckets.get(key);
      if (bucket) bucket.tips += t.feeCents;
    }

    const revenueByDay = range.map((date) => {
      const b = dayBuckets.get(date)!;
      return { date, credits: b.credits, tips: b.tips, total: b.credits + b.tips };
    });

    // --- Package breakdown (approximate — grouped by credit amount) ---
    const packageCounts = new Map<string, { count: number; credits: number; revenue: number }>();
    for (const p of allPurchases) {
      // Map delta to known package sizes
      let label = `${p.delta} credits`;
      if (p.delta === 150) label = "Starter ($1.50)";
      else if (p.delta === 500) label = "Creator ($5.00)";
      else if (p.delta === 1500) label = "Studio ($15.00)";
      else if (p.delta > 1500) label = "Bulk";

      const entry = packageCounts.get(label) ?? { count: 0, credits: 0, revenue: 0 };
      entry.count++;
      entry.credits += p.delta;
      entry.revenue += paidCents(p); // actual cents paid, not credits granted
      packageCounts.set(label, entry);
    }

    const revenueByPackage = Array.from(packageCounts.entries())
      .map(([label, data]) => ({
        id: label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        label,
        count: data.count,
        credits: data.credits,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const result: RevenueData = {
      totalRevenueCents,
      creditRevenueCents,
      tipPlatformFeesCents,
      tipGrossCents,
      totalCreditPurchases: allPurchases.length,
      totalTips: tips.length,
      revenueByDay,
      revenueByPackage,
    };

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}