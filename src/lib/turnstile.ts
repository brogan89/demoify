// Server-only: reads Turnstile config from the environment (mirrors src/lib/social.ts).

/**
 * The public Turnstile site key, or null when the captcha isn't configured.
 *
 * Read on the server and passed to forms as a prop rather than exposed as a
 * NEXT_PUBLIC_* var: those are inlined at build time, and CI only forwards a
 * couple of env vars to the build — so a NEXT_PUBLIC key couldn't be rotated
 * without a CI change and a rebuild. As a plain wrangler var it's runtime config.
 *
 * Returns null unless BOTH keys are present: the site key alone would render a
 * widget whose token nothing verifies, which is worse than no widget at all.
 */
export function turnstileSiteKey(): string | null {
  if (!process.env.TURNSTILE_SITE_KEY || !process.env.TURNSTILE_SECRET_KEY) return null;
  return process.env.TURNSTILE_SITE_KEY;
}
