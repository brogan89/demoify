import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { requireEmailVerification } from "@/lib/verification";
import { underLimit, type LimiterName } from "@/lib/rate-limit";

/**
 * Returns the current Better Auth session (or null) for the incoming request.
 * Cached per-request so multiple calls in one render don't re-hit the DB.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type GateCode = "UNAUTHORIZED" | "EMAIL_NOT_VERIFIED" | "RATE_LIMITED";

export type WriteGate =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string; code: GateCode };

/**
 * Server actions return the refusal as a plain object LITERAL at the call site:
 *
 *   const gate = await requireVerifiedUser();
 *   if (!gate.ok) return { error: gate.error, code: gate.code };
 *   const user = gate.user;
 *
 * Deliberately not extracted into a helper. TypeScript only widens an action's
 * inferred return union (adding `earned?: undefined` and friends to every
 * member) when each branch is an object literal in that function. Returning a
 * named type instead breaks that normalization, and every caller doing
 * `if (res.error) return;` then `res.earned` stops compiling.
 *
 * Route handlers have no such constraint — they use gateResponse below.
 */

/**
 * The refusal as an HTTP response, for route handlers.
 * 401 = not signed in, 403 = signed in but unverified, 429 = throttled.
 */
export function gateResponse(gate: Extract<WriteGate, { ok: false }>): Response {
  const status = gate.code === "UNAUTHORIZED" ? 401 : gate.code === "RATE_LIMITED" ? 429 : 403;
  return Response.json({ error: gate.error, code: gate.code }, { status });
}

/**
 * The write gate: signed in, email verified, and under the rate limit.
 *
 * Use at EVERY mutating entry point — server actions and route handlers alike.
 * `getCurrentUser()` stays the helper for read paths (dashboards, headers,
 * profile pages); an unverified user must still be able to see the site, they
 * just can't change it. `scripts/check-write-gates.mjs` enforces that split.
 *
 * Returns rather than throws, matching the `{ error }` convention these actions
 * already use. Pass `false` for `limiter` to skip throttling (rare — only where
 * an outer layer already throttled).
 *
 * Freshness note: this reads `emailVerified` off the session user, which is
 * live because Better Auth is configured with `database:` and no
 * `session.cookieCache`, so getSession() hits D1 every call. If cookie caching
 * is ever enabled, this gate goes stale for up to its maxAge (a just-verified
 * user stays blocked). Fix at that point with:
 *   session: { cookieCache: { version: (_s, u) => String(u.emailVerified) } }
 */
export async function requireVerifiedUser(
  limiter: LimiterName | false = "RL_WRITE",
): Promise<WriteGate> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Unauthorized", code: "UNAUTHORIZED" };
  }

  if (requireEmailVerification() && !user.emailVerified) {
    return {
      ok: false,
      error: "Verify your email to do that — check your inbox for the link.",
      code: "EMAIL_NOT_VERIFIED",
    };
  }

  if (limiter && !(await underLimit(limiter, user.id))) {
    return {
      ok: false,
      error: "You're doing that too fast. Try again in a minute.",
      code: "RATE_LIMITED",
    };
  }

  return { ok: true, user };
}
