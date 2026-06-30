/**
 * API route that returns analytics data as JSON for the admin dashboard.
 * Called client-side by the chart components.
 */
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAnalyticsData } from "@/lib/analytics";

/**
 * GET /api/analytics/stats?days=30
 *
 * Returns a full AnalyticsData JSON payload for the analytics dashboard.
 * Requires the request to include a valid session (admin check happens inside
 * getAnalyticsData via isCurrentUserAdmin, but since this is a route handler
 * not a server action, we check at the route level).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1), 365);

    const data = await getAnalyticsData(days);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
