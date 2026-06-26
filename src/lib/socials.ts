// Band social/website links. Stored on Band.socialLinks as a JSON object map of
// `{ [platformKey]: url }`. This module is pure TS (no JSX) so it can be imported
// by the server action, the public page, and the edit form without bundling the
// brand-icon SVGs (those live in src/components/social-links.tsx).

// How a link's visible text is derived from its URL:
//  - "domain":    hostname without "www." (the website)
//  - "handle":    "@" + first path segment (instagram.com/foo → @foo)
//  - "subdomain": first hostname label (foo.bandcamp.com → @foo)
//  - "label":     the platform's name (for ID-based URLs like Spotify/Apple Music)
type Display = "domain" | "handle" | "subdomain" | "label";

export type SocialPlatform = {
  key: string;
  label: string;
  placeholder: string;
  display: Display;
};

// Order here is the order links render on the profile.
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "website", label: "Website", placeholder: "https://yourband.com", display: "domain" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourband", display: "handle" },
  { key: "x", label: "X", placeholder: "https://x.com/yourband", display: "handle" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourband", display: "handle" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourband", display: "handle" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourband", display: "handle" },
  { key: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/…", display: "label" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "https://soundcloud.com/yourband", display: "handle" },
  { key: "bandcamp", label: "Bandcamp", placeholder: "https://yourband.bandcamp.com", display: "subdomain" },
  { key: "applemusic", label: "Apple Music", placeholder: "https://music.apple.com/artist/…", display: "label" },
];

const PLATFORMS_BY_KEY = new Map(SOCIAL_PLATFORMS.map((p) => [p.key, p]));
export const SOCIAL_KEYS = new Set(SOCIAL_PLATFORMS.map((p) => p.key));

export type SocialLinkMap = Record<string, string>;

/** The text shown next to a platform's icon, derived from its URL. */
export function socialDisplay(key: string, url: string): string {
  const platform = PLATFORMS_BY_KEY.get(key);
  const label = platform?.label ?? key;
  if (!platform || platform.display === "label") return label;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return label;
  }

  switch (platform.display) {
    case "domain":
      return parsed.hostname.replace(/^www\./, "");
    case "subdomain": {
      const sub = parsed.hostname.split(".")[0];
      return sub ? `@${sub}` : label;
    }
    case "handle": {
      const seg = parsed.pathname.split("/").filter(Boolean)[0];
      return seg ? `@${seg.replace(/^@/, "")}` : parsed.hostname.replace(/^www\./, "");
    }
    default:
      return label;
  }
}

/** Safely parse Band.socialLinks JSON, keeping only known, non-empty string links. */
export function parseSocialLinks(json: string | null | undefined): SocialLinkMap {
  if (!json) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const out: SocialLinkMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (SOCIAL_KEYS.has(key) && typeof value === "string" && value.trim()) {
      out[key] = value;
    }
  }
  return out;
}

const MAX_URL_LENGTH = 200;

/**
 * Validate/normalize a links map for storage: known keys only, trimmed, scheme
 * prepended if missing, must be a valid http(s) URL within the length cap. Blank
 * values are dropped (so clearing a field removes the link).
 */
export function cleanSocialLinks(
  input: SocialLinkMap,
): { ok: SocialLinkMap } | { error: string } {
  const out: SocialLinkMap = {};
  for (const [key, rawValue] of Object.entries(input)) {
    if (!SOCIAL_KEYS.has(key)) continue;
    const trimmed = (rawValue ?? "").trim();
    if (!trimmed) continue;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    if (withScheme.length > MAX_URL_LENGTH) {
      return { error: `${PLATFORMS_BY_KEY.get(key)?.label ?? key} link is too long` };
    }
    let parsed: URL;
    try {
      parsed = new URL(withScheme);
    } catch {
      return { error: `${PLATFORMS_BY_KEY.get(key)?.label ?? key} link isn't a valid URL` };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: `${PLATFORMS_BY_KEY.get(key)?.label ?? key} link must be http(s)` };
    }
    out[key] = withScheme;
  }
  return { ok: out };
}
