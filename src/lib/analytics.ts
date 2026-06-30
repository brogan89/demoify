/**
 * Analytics queries for the Demoify admin dashboard.
 *
 * All queries read directly from D1 via Prisma. The dashboard uses these to
 * display MRR, active users, upload counts, engagement metrics, and revenue.
 *
 * IMPORTANT: these are "use server" functions (called from RSC pages). The API
 * route in src/app/api/analytics/stats/route.ts wraps them with a JSON response
 * for the dashboard's client-side charting.
 */
"use server";

import { prisma } from "@/lib/db";
import { isCurrentUserAdmin } from "@/lib/admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimeBucket = "day" | "week" | "month";

export type AnalyticsSnapshot = {
  /** Total registered users. */
  totalUsers: number;
  /** Users who were created within the past N days. */
  newUsers: number;
  /** Users who logged in (have a session) in the past N days. */
  activeUsers: number;
  /** Total bands (artist profiles). */
  totalBands: number;
  /** Total song projects. */
  totalSongs: number;
  /** Songs created within the past N days. */
  newSongs: number;
  /** Lifetime play count across all songs. */
  totalPlays: number;
  /** Plays within the past N days. */
  recentPlays: number;
  /** Total comments. */
  totalComments: number;
  /** Comments within the past N days. */
  recentComments: number;
  /** Total likes. */
  totalLikes: number;
  /** Total tips received (count). */
  totalTips: number;
  /** Total tips volume in cents (platform fee portion). */
  tipRevenueCents: number;
  /** Tips volume within the past N days. */
  recentTipVolumeCents: number;
  /** Total credit purchases (count). */
  totalCreditPurchases: number;
  /** Total credit purchase volume in cents. */
  creditRevenueCents: number;
  /** Credit purchase volume within the past N days. */
  recentCreditRevenueCents: number;
  /** Total credits in circulation (sum of all band balances). */
  totalCreditsInCirculation: number;
  /** Combined revenue (tips platform fee + credit purchases). */
  totalRevenueCents: number;
  /** MRR estimate: revenue from past 30 days * 12 / 365 * 30 (smoothed). */
  estimatedMmrCents: number;
};

export type TimeSeriesEntry = {
  date: string; // "YYYY-MM-DD"
  value: number;
};

export type AnalyticsData = {
  snapshot: AnalyticsSnapshot;
  signupsOverTime: TimeSeriesEntry[];
  uploadsOverTime: TimeSeriesEntry[];
  playsOverTime: TimeSeriesEntry[];
  commentsOverTime: TimeSeriesEntry[];
  revenueOverTime: TimeSeriesEntry[];
  topSongs: { id: string; title: string; artist: string; playCount: number }[];
  recentActivity: {
    type: "signup" | "upload" | "tip" | "purchase";
    label: string;
    amount?: string;
    at: Date;
  }[];
};

// ---------------------------------------------------------------------------
// Snapshot (current totals)
// ---------------------------------------------------------------------------

export async function getSnapshot(days: number = 30): Promise<AnalyticsSnapshot> {
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400_000);

  const [
    totalUsers,
    newUsers,
    totalBands,
    totalSongs,
    newSongs,
    totalComments,
    recentComments,
    totalLikes,
    topPlaysResult,
    recentPlaysResult,
    tips,
    recentTips,
    creditTx,
    recentCreditTx,
    creditBalance,
    activeSessions,
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    // New users in period
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    // Total bands
    prisma.band.count(),
    // Total songs
    prisma.songProject.count(),
    // New songs in period
    prisma.songProject.count({ where: { createdAt: { gte: since } } }),
    // Total comments
    prisma.comment.count(),
    // Recent comments
    prisma.comment.count({ where: { createdAt: { gte: since } } }),
    // Total likes
    prisma.like.count(),
    // Total plays (aggregate)
    prisma.songProject.aggregate({ _sum: { playCount: true } }),
    // Recent plays — we approximate via engagement-granted plays
    prisma.creditTransaction.count({
      where: { reason: "play", createdAt: { gte: since } },
    }),
    // Tips
    prisma.tip.aggregate({
      _count: true,
      _sum: { feeCents: true, amountCents: true },
    }),
    // Recent tips
    prisma.tip.findMany({
      where: { createdAt: { gte: since } },
      select: { amountCents: true, feeCents: true },
    }),
    // Credit purchases (purchase transactions)
    prisma.creditTransaction.findMany({
      where: { reason: "purchase" },
      select: { delta: true, createdAt: true },
    }),
    // Recent credit purchases
    prisma.creditTransaction.findMany({
      where: { reason: "purchase", createdAt: { gte: since } },
      select: { delta: true },
    }),
    // Total credits in circulation
    prisma.band.aggregate({ _sum: { credits: true } }),
    // Active users — we approximate via recent sessions
    prisma.session.count({
      where: { createdAt: { gte: since } },
    }),
  ]);

  const totalPlays = topPlaysResult._sum.playCount ?? 0;
  const totalTipsCount = tips._count;
  const totalTipFeeCents = tips._sum.feeCents ?? 0;
  const totalTipGrossCents = tips._sum.amountCents ?? 0;
  const recentTipVolumeCents = recentTips.reduce((s, t) => s + t.amountCents, 0);

  // Credit purchases: delta is positive (credits granted)
  // Price is credits / 100 = cents (1 credit = 1 cent)
  const totalCreditPurchaseCredits = creditTx.reduce((s, t) => s + t.delta, 0);
  const totalCreditRevenueCents = totalCreditPurchaseCredits;
  const recentCreditPurchaseCredits = recentCreditTx.reduce((s, t) => s + t.delta, 0);
  const recentCreditRevenueCents = recentCreditPurchaseCredits;

  // MRR estimate: (revenue in last 30d) / days * 30
  const recentTotalRevenueCents = recentTipVolumeCents + recentCreditRevenueCents;
  const estimatedMmrCents = days > 0
    ? Math.round((recentTotalRevenueCents / days) * 30)
    : 0;

  return {
    totalUsers,
    newUsers,
    activeUsers: activeSessions,
    totalBands,
    totalSongs,
    newSongs,
    totalPlays,
    recentPlays: recentPlaysResult,
    totalComments,
    recentComments,
    totalLikes,
    totalTips: totalTipsCount,
    tipRevenueCents: totalTipFeeCents,
    recentTipVolumeCents,
    totalCreditPurchases: creditTx.length,
    creditRevenueCents: totalCreditRevenueCents,
    recentCreditRevenueCents,
    totalCreditsInCirculation: creditBalance._sum?.credits ?? 0,
    totalRevenueCents: totalTipFeeCents + totalCreditRevenueCents,
    estimatedMmrCents,
  };
}

// ---------------------------------------------------------------------------
// Time series helpers (for charts)
// ---------------------------------------------------------------------------

/**
 * Generate an array of date strings from `days` ago up to today.
 */
function dateRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function getSignupsOverTime(days: number = 30): Promise<TimeSeriesEntry[]> {
  const range = dateRange(days);
  const users = await prisma.user.findMany({
    select: { createdAt: true },
    where: { createdAt: { gte: new Date(range[0]) } },
  });

  const buckets = new Map<string, number>();
  for (const date of range) buckets.set(date, 0);
  for (const u of users) {
    const key = u.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return range.map((date) => ({ date, value: buckets.get(date) ?? 0 }));
}

export async function getUploadsOverTime(days: number = 30): Promise<TimeSeriesEntry[]> {
  const range = dateRange(days);
  const songs = await prisma.songProject.findMany({
    select: { createdAt: true },
    where: { createdAt: { gte: new Date(range[0]) } },
  });

  const buckets = new Map<string, number>();
  for (const date of range) buckets.set(date, 0);
  for (const s of songs) {
    const key = s.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return range.map((date) => ({ date, value: buckets.get(date) ?? 0 }));
}

export async function getPlaysOverTime(days: number = 30): Promise<TimeSeriesEntry[]> {
  const range = dateRange(days);

  // Use engagement credit transactions as a proxy — each "play" engagement
  // represents a full listen by a logged-in user. This undercounts anonymous
  // plays but gives a directional trend.
  const plays = await prisma.creditTransaction.findMany({
    select: { createdAt: true },
    where: { reason: "play", createdAt: { gte: new Date(range[0]) } },
  });

  const buckets = new Map<string, number>();
  for (const date of range) buckets.set(date, 0);
  for (const p of plays) {
    const key = p.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return range.map((date) => ({ date, value: buckets.get(date) ?? 0 }));
}

export async function getCommentsOverTime(days: number = 30): Promise<TimeSeriesEntry[]> {
  const range = dateRange(days);
  const comments = await prisma.comment.findMany({
    select: { createdAt: true },
    where: { createdAt: { gte: new Date(range[0]) } },
  });

  const buckets = new Map<string, number>();
  for (const date of range) buckets.set(date, 0);
  for (const c of comments) {
    const key = c.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return range.map((date) => ({ date, value: buckets.get(date) ?? 0 }));
}

export async function getRevenueOverTime(days: number = 30): Promise<TimeSeriesEntry[]> {
  const range = dateRange(days);

  const [purchases, tips] = await Promise.all([
    prisma.creditTransaction.findMany({
      select: { delta: true, createdAt: true },
      where: { reason: "purchase", createdAt: { gte: new Date(range[0]) } },
    }),
    prisma.tip.findMany({
      select: { amountCents: true, feeCents: true, createdAt: true },
      where: { createdAt: { gte: new Date(range[0]) } },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (const date of range) buckets.set(date, 0);

  for (const p of purchases) {
    const key = p.createdAt.toISOString().slice(0, 10);
    // delta is credits granted = cents spent (1 credit = $0.01)
    buckets.set(key, (buckets.get(key) ?? 0) + p.delta);
  }

  for (const t of tips) {
    const key = t.createdAt.toISOString().slice(0, 10);
    // Platform's 10% fee
    buckets.set(key, (buckets.get(key) ?? 0) + t.feeCents);
  }

  return range.map((date) => ({ date, value: Math.round(buckets.get(date) ?? 0) }));
}

export async function getTopSongs(limit: number = 10): Promise<{ id: string; title: string; artist: string; playCount: number }[]> {
  const songs = await prisma.songProject.findMany({
    orderBy: { playCount: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      playCount: true,
      band: { select: { displayName: true } },
    },
  });

  return songs.map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.band.displayName,
    playCount: s.playCount,
  }));
}

export async function getRecentActivity(limit: number = 20): Promise<AnalyticsData["recentActivity"]> {
  const [signups, uploads, tips, purchases] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { name: true, createdAt: true } }),
    prisma.songProject.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { title: true, createdAt: true, band: { select: { displayName: true } } } }),
    prisma.tip.findMany({ orderBy: { createdAt: "desc" }, take: limit, select: { amountCents: true, createdAt: true } }),
    prisma.creditTransaction.findMany({ where: { reason: "purchase" }, orderBy: { createdAt: "desc" }, take: limit, select: { delta: true, createdAt: true } }),
  ]);

  const activity: AnalyticsData["recentActivity"] = [];

  for (const s of signups) {
    activity.push({ type: "signup", label: `${s.name} signed up`, at: s.createdAt });
  }
  for (const u of uploads) {
    activity.push({ type: "upload", label: `${u.band.displayName} uploaded "${u.title}"`, at: u.createdAt });
  }
  for (const t of tips) {
    activity.push({ type: "tip", label: `Tip received`, amount: `$${(t.amountCents / 100).toFixed(2)}`, at: t.createdAt });
  }
  for (const p of purchases) {
    activity.push({ type: "purchase", label: `Credits purchased`, amount: `$${(p.delta / 100).toFixed(2)}`, at: p.createdAt });
  }

  // Sort by date descending, newest first
  activity.sort((a, b) => b.at.getTime() - a.at.getTime());
  return activity.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Full analytics data (all-in-one for the dashboard)
// ---------------------------------------------------------------------------

export async function getAnalyticsData(days: number = 30): Promise<AnalyticsData> {
  const [snapshot, signupsOverTime, uploadsOverTime, playsOverTime, commentsOverTime, revenueOverTime, topSongs, recentActivity] =
    await Promise.all([
      getSnapshot(days),
      getSignupsOverTime(days),
      getUploadsOverTime(days),
      getPlaysOverTime(days),
      getCommentsOverTime(days),
      getRevenueOverTime(days),
      getTopSongs(),
      getRecentActivity(),
    ]);

  return {
    snapshot,
    signupsOverTime,
    uploadsOverTime,
    playsOverTime,
    commentsOverTime,
    revenueOverTime,
    topSongs,
    recentActivity,
  };
}
