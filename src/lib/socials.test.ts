import { describe, expect, it } from "vitest";

import {
  SOCIAL_KEYS,
  SOCIAL_PLATFORMS,
  cleanSocialLinks,
  parseSocialLinks,
  socialDisplay,
} from "./socials";

describe("socialDisplay", () => {
  it("shows the bare domain for the website, without www or path", () => {
    expect(socialDisplay("website", "https://www.yourband.com")).toBe("yourband.com");
    expect(socialDisplay("website", "https://yourband.com/about")).toBe("yourband.com");
  });

  it("shows the first path segment as a handle", () => {
    expect(socialDisplay("instagram", "https://instagram.com/foo")).toBe("@foo");
    expect(socialDisplay("youtube", "https://youtube.com/@foo/videos")).toBe("@foo");
    expect(socialDisplay("soundcloud", "https://soundcloud.com/yourband")).toBe("@yourband");
  });

  it("does not double the @ when the path already has one", () => {
    expect(socialDisplay("tiktok", "https://tiktok.com/@yourband")).toBe("@yourband");
  });

  it("shows the first hostname label for Bandcamp", () => {
    expect(socialDisplay("bandcamp", "https://foo.bandcamp.com")).toBe("@foo");
  });

  // Spotify and Apple Music use opaque ID-based URLs, so they short-circuit to the
  // platform name before any parsing happens.
  it("shows the platform name for ID-based platforms", () => {
    expect(socialDisplay("spotify", "https://open.spotify.com/artist/abc123")).toBe("Spotify");
    expect(socialDisplay("applemusic", "anything at all")).toBe("Apple Music");
  });

  it("falls back to the platform name when the URL won't parse", () => {
    expect(socialDisplay("instagram", "not a url")).toBe("Instagram");
    expect(socialDisplay("website", "")).toBe("Website");
  });

  it("falls back to the hostname when a handle URL has no path", () => {
    expect(socialDisplay("instagram", "https://instagram.com")).toBe("instagram.com");
    expect(socialDisplay("x", "https://www.x.com/")).toBe("x.com");
  });

  it("falls back to the key itself for an unknown platform", () => {
    expect(socialDisplay("nope", "https://x.com/foo")).toBe("nope");
  });

  // Characterization: a Bandcamp URL that isn't on an artist subdomain displays
  // the platform's own hostname label. Cosmetic only — cleanSocialLinks doesn't
  // enforce the subdomain shape.
  it("shows '@bandcamp' for a non-subdomain Bandcamp URL", () => {
    expect(socialDisplay("bandcamp", "https://bandcamp.com/foo")).toBe("@bandcamp");
  });
});

describe("parseSocialLinks", () => {
  it("returns {} for missing or malformed JSON", () => {
    expect(parseSocialLinks(null)).toEqual({});
    expect(parseSocialLinks(undefined)).toEqual({});
    expect(parseSocialLinks("")).toEqual({});
    expect(parseSocialLinks("not json")).toEqual({});
  });

  it("returns {} for JSON that isn't an object map", () => {
    expect(parseSocialLinks('"a string"')).toEqual({});
    expect(parseSocialLinks("123")).toEqual({});
    expect(parseSocialLinks("null")).toEqual({});
    expect(parseSocialLinks("true")).toEqual({});
  });

  // Arrays are typeof "object", so they pass the guard and fall through to the
  // entry loop — where numeric keys aren't in SOCIAL_KEYS, so nothing survives.
  it("returns {} for an array", () => {
    expect(parseSocialLinks("[]")).toEqual({});
    expect(parseSocialLinks('["https://instagram.com/foo"]')).toEqual({});
  });

  it("keeps only known keys with non-blank string values", () => {
    const json = JSON.stringify({
      instagram: "https://instagram.com/foo",
      evil: "https://evil.com",
      x: "",
      website: "   ",
      spotify: 42,
    });
    expect(parseSocialLinks(json)).toEqual({ instagram: "https://instagram.com/foo" });
  });

  it("preserves the stored value verbatim, without trimming", () => {
    expect(parseSocialLinks('{"website":" https://a.com "}')).toEqual({
      website: " https://a.com ",
    });
  });
});

describe("cleanSocialLinks", () => {
  it("prepends a scheme when one is missing", () => {
    expect(cleanSocialLinks({ website: "yourband.com" })).toEqual({
      ok: { website: "https://yourband.com" },
    });
  });

  it("trims without double-scheming an already-schemed URL", () => {
    expect(cleanSocialLinks({ website: "  https://yourband.com  " })).toEqual({
      ok: { website: "https://yourband.com" },
    });
    expect(cleanSocialLinks({ website: "http://yourband.com" })).toEqual({
      ok: { website: "http://yourband.com" },
    });
  });

  it("drops blank values, so clearing a field removes the link", () => {
    expect(cleanSocialLinks({ website: "" })).toEqual({ ok: {} });
    expect(cleanSocialLinks({ website: "   " })).toEqual({ ok: {} });
  });

  it("skips unknown keys rather than erroring on them", () => {
    expect(cleanSocialLinks({ evil: "https://evil.com" })).toEqual({ ok: {} });
  });

  it("keeps several links at once", () => {
    expect(
      cleanSocialLinks({ website: "a.com", instagram: "https://instagram.com/foo" }),
    ).toEqual({
      ok: { website: "https://a.com", instagram: "https://instagram.com/foo" },
    });
  });

  it("rejects a value that can't parse as a URL, naming the platform", () => {
    expect(cleanSocialLinks({ spotify: "not a url with spaces" })).toEqual({
      error: "Spotify link isn't a valid URL",
    });
    expect(cleanSocialLinks({ instagram: "https://" })).toEqual({
      error: "Instagram link isn't a valid URL",
    });
  });

  it("rejects a URL over 200 characters, measured after the scheme is added", () => {
    expect(cleanSocialLinks({ website: `https://${"a".repeat(200)}.com` })).toEqual({
      error: "Website link is too long",
    });
    // 193 chars + "https://" = 201, over the cap only once the scheme is prepended.
    expect(cleanSocialLinks({ website: `${"a".repeat(189)}.com` })).toEqual({
      error: "Website link is too long",
    });
  });

  it("stores the scheme verbatim rather than normalizing its case", () => {
    expect(cleanSocialLinks({ website: "HTTP://Example.com" })).toEqual({
      ok: { website: "HTTP://Example.com" },
    });
  });

  it("rejects a non-http scheme rather than rewriting it", () => {
    expect(cleanSocialLinks({ website: "ftp://files.example.com" })).toEqual({
      error: "Website link must be http(s)",
    });
    expect(cleanSocialLinks({ website: "mailto:band@example.com" })).toEqual({
      error: "Website link must be http(s)",
    });
  });

  // "javascript:alert(1)" was already refused before the protocol check became
  // reachable, but by the new URL catch rather than on purpose: "https://" used to
  // be prepended, and "https://javascript:alert(1)" fails to parse because
  // "alert(1)" isn't a valid port. Nothing is prepended now, so it parses cleanly
  // as a javascript: URL and is turned away by the check written for it.
  it("rejects a javascript: URL by protocol, not by a parse failure", () => {
    expect(cleanSocialLinks({ instagram: "javascript:alert(1)" })).toEqual({
      error: "Instagram link must be http(s)",
    });
  });

  // Characterization: a bare host:port is indistinguishable from a scheme —
  // "yourband.com" is itself a syntactically valid scheme name — so this parses as
  // protocol "yourband.com:" and is rejected. Accepted tradeoff for making the
  // protocol check reachable; the user's fix is to type the scheme.
  it("rejects a bare host:port, which reads as a scheme", () => {
    expect(cleanSocialLinks({ website: "yourband.com:8080" })).toEqual({
      error: "Website link must be http(s)",
    });
    expect(cleanSocialLinks({ website: "https://yourband.com:8080" })).toEqual({
      ok: { website: "https://yourband.com:8080" },
    });
  });
});

describe("the platform table", () => {
  it("has no duplicate keys, since PLATFORMS_BY_KEY resolves by key", () => {
    const keys = SOCIAL_PLATFORMS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps SOCIAL_KEYS in sync with SOCIAL_PLATFORMS", () => {
    expect(SOCIAL_KEYS).toEqual(new Set(SOCIAL_PLATFORMS.map((p) => p.key)));
  });

  // Every placeholder is shown to the user as an example of valid input, so each
  // one should survive the validator it's an example for.
  it("uses placeholders that its own validator accepts", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      const result = cleanSocialLinks({ [platform.key]: platform.placeholder });
      expect(result, `${platform.key} placeholder`).toHaveProperty("ok");
    }
  });
});
