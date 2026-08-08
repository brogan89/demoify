import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { underLimit, clientIp } from "@/lib/rate-limit";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

/**
 * IP-throttle every auth mutation before it reaches Better Auth.
 *
 * Better Auth has its own limiter, but it defaults to in-memory storage, which
 * on Workers means one counter per isolate — the effective ceiling is
 * (limit × isolates). This runs first, costs no D1 round-trip, and covers the
 * endpoints worth automating: signup, and the verification-resend endpoint that
 * would otherwise let someone bomb a registered address (or burn the Resend
 * quota) a few requests at a time.
 *
 * Keyed per-path so a signup flood can't also lock the caller out of login.
 */
export async function POST(req: Request) {
  const { pathname } = new URL(req.url);
  if (!(await underLimit("RL_AUTH", `${await clientIp()}:${pathname}`))) {
    return Response.json({ message: "Too many requests. Try again shortly." }, { status: 429 });
  }
  return handlers.POST(req);
}
