/**
 * The instance's canonical public origin.
 *
 * One source of truth, because three separate consumers need an absolute URL
 * and they must agree: `metadataBase` (so OG/Twitter image URLs resolve),
 * sitemap.ts / robots.ts, and the federation submitter's outbound links. A
 * mismatch here doesn't throw — it silently emits link previews and sitemap
 * entries pointing at the wrong host.
 *
 * `NEXT_PUBLIC_APP_URL` wins so a self-hoster can serve the app on a different
 * origin than the auth callback URL. In production both are demoify.app.
 */
export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** `siteOrigin()` as a URL, for Next's `metadataBase`. */
export function siteUrl(): URL {
  return new URL(siteOrigin());
}
