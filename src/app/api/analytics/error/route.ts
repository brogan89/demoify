/**
 * Error reporting endpoint.
 *
 * This is called from the browser whenever a client-side error is caught.
 * It logs errors to Cloudflare Workers console (visible in Workers Logs / Tail).
 *
 * POST /api/analytics/error
 * Body: { message: string, stack?: string, url?: string, userAgent?: string, userId?: string }
 */
import { NextResponse } from "next/server";

type ErrorReport = {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
};

export async function POST(request: Request) {
  try {
    const body: ErrorReport = await request.json();

    if (!body.message) {
      return NextResponse.json({ ok: false, error: "message is required" }, { status: 400 });
    }

    // Log to Cloudflare Workers console (appears in Workers Logs / Tail)
    console.error(
      JSON.stringify({
        type: "client_error",
        message: body.message,
        stack: body.stack?.slice(0, 1000),
        url: body.url,
        userAgent: body.userAgent,
        userId: body.userId,
        timestamp: new Date().toISOString(),
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
