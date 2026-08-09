"use server";

import { cookies } from "next/headers";
import {
  REF_COOKIE,
  REF_MAX_AGE_SECONDS,
  normalizeRefSource,
} from "@/lib/attribution";
import { underLimit, clientIp } from "@/lib/rate-limit";

/**
 * Record the first-touch acquisition channel for this browser.
 *
 * This started life as Next middleware, which is the natural home for it. It
 * can't be: Next 16 renamed Middleware to Proxy and pinned it to the Node.js
 * runtime with no `runtime` config escape hatch, and @opennextjs/cloudflare
 * hard-fails the build on Node middleware ("Node.js middleware is not currently
 * supported"). So the capture happens from a client effect instead — see
 * src/components/attribution-capture.tsx.
 *
 * Ungated by necessity: the whole point is to identify visitors before they
 * have an account. Same shape as setActiveBand — it writes a cookie and nothing
 * else, touches no user data, and is listed EXEMPT in
 * scripts/check-write-gates.mjs on that basis.
 *
 * Returns void. The caller is fire-and-forget; a visitor must never see an
 * error because a marketing metric didn't record.
 */
export async function captureRefSource(rawTag: string): Promise<void> {
  const tag = normalizeRefSource(rawTag);
  if (!tag) return;

  const store = await cookies();

  // First touch wins. The Reddit post that actually won someone keeps the
  // credit even if they return later via a bookmark or a search result.
  if (store.has(REF_COOKIE)) return;

  // Cheap, but still a public unauthenticated entry point — don't let it be
  // used as a free CPU burner. Failing the limit just skips attribution.
  if (!(await underLimit("RL_PUBLIC", await clientIp()))) return;

  store.set(REF_COOKIE, tag, {
    maxAge: REF_MAX_AGE_SECONDS,
    path: "/",
    // Server-read only. Keeping it out of document.cookie means an XSS can't
    // rewrite attribution, and it is read back only by the signup hook.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
