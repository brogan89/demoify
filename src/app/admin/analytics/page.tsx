import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TrendingUp, Users, Music, CreditCard, Play, MessageSquare, Heart } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getAnalyticsData, type AnalyticsData } from "@/lib/analytics";

export default async function AnalyticsPage() {
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");

  let data: AnalyticsData | null = null;
  let error: string | null = null;

  try {
    data = await getAnalyticsData(30);
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load analytics data";
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Admin
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Usage, revenue, and engagement metrics for the last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="size-4" />
          Auto-refreshes on page reload
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              icon={<Users className="size-4" />}
              label="Total Users"
              value={data.snapshot.totalUsers.toLocaleString()}
              detail={`+${data.snapshot.newUsers} new`}
            />
            <StatCard
              icon={<Users className="size-4" />}
              label="Active Users (30d)"
              value={data.snapshot.activeUsers.toLocaleString()}
            />
            <StatCard
              icon={<Music className="size-4" />}
              label="Total Songs"
              value={data.snapshot.totalSongs.toLocaleString()}
              detail={`+${data.snapshot.newSongs} new`}
            />
            <StatCard
              icon={<Play className="size-4" />}
              label="Plays (30d)"
              value={data.snapshot.recentPlays.toLocaleString()}
              detail={`${data.snapshot.totalPlays.toLocaleString()} lifetime`}
            />
            <StatCard
              icon={<CreditCard className="size-4" />}
              label="Est. MRR"
              value={`$${(data.snapshot.estimatedMmrCents / 100).toFixed(2)}`}
              detail={`$${(data.snapshot.totalRevenueCents / 100).toFixed(2)} total`}
            />
            <StatCard
              icon={<TrendingUp className="size-4" />}
              label="Credits in Circulation"
              value={data.snapshot.totalCreditsInCirculation.toLocaleString()}
            />
          </div>

          {/* Charts */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Signups" data={data.signupsOverTime} color="#22c55e" unit="users" />
            <ChartCard title="Uploads" data={data.uploadsOverTime} color="#3b82f6" unit="songs" />
            <ChartCard title="Plays (engagement)" data={data.playsOverTime} color="#a855f7" unit="plays" />
            <ChartCard title="Comments" data={data.commentsOverTime} color="#f59e0b" unit="comments" />
            <ChartCard title="Revenue (cents)" data={data.revenueOverTime} color="#10b981" unit="cents" />
          </div>

          {/* Top songs & Recent activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TopSongsCard songs={data.topSongs} />
            <RecentActivityCard activity={data.recentActivity} />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-semibold tabular-nums tracking-tight">{value}</div>
      {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart card — simple horizontal bar-chart visualization
// ---------------------------------------------------------------------------

function ChartCard({
  title,
  data,
  color,
  unit,
}: {
  title: string;
  data: { date: string; value: number }[];
  color: string;
  unit: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = (total / data.length).toFixed(1);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Total: {total}</span>
          <span>Avg: {avg}/{unit}/day</span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-sm transition-opacity hover:opacity-80"
            style={{
              height: `${Math.max((d.value / max) * 100, 1)}%`,
              backgroundColor: color,
            }}
            title={`${d.date}: ${d.value} ${unit}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>{data[0]?.date?.slice(5) ?? ""}</span>
        <span>{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top songs card
// ---------------------------------------------------------------------------

function TopSongsCard({
  songs,
}: {
  songs: { id: string; title: string; artist: string; playCount: number }[];
}) {
  const maxPlay = Math.max(...songs.map((s) => s.playCount), 1);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-medium">Top Songs</h3>
      {songs.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No songs yet</p>
      ) : (
        <div className="space-y-2">
          {songs.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted-foreground">{s.artist}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs tabular-nums">
                <Play className="size-3" />
                {s.playCount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity card
// ---------------------------------------------------------------------------

function RecentActivityCard({
  activity,
}: {
  activity: {
    type: "signup" | "upload" | "tip" | "purchase";
    label: string;
    amount?: string;
    at: Date;
  }[];
}) {
  const typeIcon = (t: string) => {
    switch (t) {
      case "signup": return <Users className="size-3 text-green-500" />;
      case "upload": return <Music className="size-3 text-blue-500" />;
      case "tip": return <Heart className="size-3 text-red-500" />;
      case "purchase": return <CreditCard className="size-3 text-amber-500" />;
      default: return null;
    }
  };

  const timeAgo = (d: Date) => {
    const secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-medium">Recent Activity</h3>
      {activity.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No recent activity</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activity.slice(0, 20).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {typeIcon(a.type)}
              <span className="flex-1 truncate">{a.label}</span>
              {a.amount && <span className="tabular-nums text-muted-foreground">{a.amount}</span>}
              <span className="shrink-0 text-muted-foreground">{timeAgo(a.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
