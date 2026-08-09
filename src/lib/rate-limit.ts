import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Rate limiters declared in wrangler.jsonc under `ratelimits`. */
export type LimiterName = "RL_AUTH" | "RL_WRITE" | "RL_UPLOAD" | "RL_PUBLIC";

/** Cloudflare's rate-limiting binding surface (see @cloudflare/workers-types). */
type RateLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> };

const missingWarned = new Set<string>();

/**
 * True when this key is still under the limiter's budget.
 *
 * Fails OPEN when the binding is absent, so self-hosters without the
 * `ratelimits` block in wrangler.jsonc aren't broken by this — but warns once
 * per limiter, so a misconfigured deploy isn't silently unprotected either.
 *
 * Counters are per-Cloudflare-location, not global: a distributed attacker gets
 * roughly (limit × colos). That's fine for what this defends against — it's a
 * brake on scripted abuse, not a global quota.
 */
export async function underLimit(name: LimiterName, key: string): Promise<boolean> {
  const { env } = getCloudflareContext();
  const limiter = (env as unknown as Record<string, RateLimiter | undefined>)[name];
  if (!limiter) {
    if (!missingWarned.has(name)) {
      missingWarned.add(name);
      console.warn(`[rate-limit] Binding '${name}' not found — requests are unthrottled.`);
    }
    return true;
  }
  const { success } = await limiter.limit({ key });
  return success;
}

/**
 * The caller's IP for rate-limit keying.
 *
 * Reads CF-Connecting-IP specifically. X-Forwarded-For is NOT usable here:
 * Cloudflare *appends* the real client IP rather than replacing the header, so
 * the first entry is whatever the client sent — trivially rotated to defeat any
 * IP-keyed limit. CF-Connecting-IP is always overwritten at the edge.
 */
export async function clientIp(): Promise<string> {
  return (await headers()).get("cf-connecting-ip") ?? "unknown";
}
