/**
 * First-touch signup attribution.
 *
 * The launch plan ranks channels by "signups by source" and picks one to double
 * down on. `/admin/analytics` could count signups but never say where they came
 * from, so the ranking didn't exist. This captures the channel tag from the
 * landing URL into a cookie, and the Better Auth user-create hook copies it onto
 * the user row.
 *
 * FIRST touch, not last: someone who arrives from Reddit, leaves, and returns a
 * week later via a Google search was won by Reddit. The cookie is only written
 * when absent (see src/middleware.ts).
 *
 * Deliberately dependency-free — imported by middleware (edge runtime), by the
 * auth hook (node), and by tests.
 */

/** First-touch channel cookie. Read at signup, then never again. */
export const REF_COOKIE = "demoify_ref";

/** 30 days: long enough to cover "saw the post, signed up next weekend". */
export const REF_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Hard cap on a stored tag — this lands in a DB column and an admin table. */
export const REF_MAX_LENGTH = 64;

/**
 * Bucket label for signups with no channel tag.
 *
 * Lives here rather than in analytics.ts because that module is `"use server"`,
 * where every export must be an async function — a plain const there is a build
 * error, not a style preference.
 */
export const UNTAGGED_SOURCE = "direct / untagged";

/**
 * Clean an untrusted channel tag into something safe to store and group by.
 *
 * The value comes from a query string, so it is fully attacker-controlled: it
 * can be arbitrarily long, contain markup, or be crafted to look like another
 * channel. Lowercasing plus a strict charset means `Reddit`, `reddit`, and
 * `reddit ` all group as one channel instead of three.
 *
 * Returns null when nothing usable survives, which callers treat as "no tag".
 */
export function normalizeRefSource(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .trim()
    .toLowerCase()
    // Collapse anything outside the allowed set into a single underscore, so
    // "reddit / r-musicproduction" doesn't become a run of separators.
    .replace(/[^a-z0-9_.-]+/g, "_")
    // Trim separator runs from both ends.
    .replace(/^[_.-]+|[_.-]+$/g, "")
    .slice(0, REF_MAX_LENGTH)
    // Slicing can leave a trailing separator behind.
    .replace(/[_.-]+$/g, "");

  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Pick the channel tag out of a URL's query string.
 *
 * `ref` wins over `utm_source` because the launch plan hands out `?ref=` links
 * (`?ref=reddit_musicproduction`); `utm_source` is accepted so links built by
 * other tools, or forwarded from an email client, still attribute.
 */
export function readRefParam(params: URLSearchParams): string | null {
  return normalizeRefSource(params.get("ref") ?? params.get("utm_source"));
}
