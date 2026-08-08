import { afterEach, describe, expect, it, vi } from "vitest";

// r2.ts imports the AWS SDK at module scope purely to build the lazy S3 client.
// These are pure-string tests, so stub it rather than pay to load it.
vi.mock("@aws-sdk/client-s3", () => ({ S3Client: class {} }));

const CDN = "https://cdn.example.com";
const PREFIX = "songs/proj123/";

/**
 * src/lib/r2.ts:14-15 captures R2_BUCKET and R2_PUBLIC_URL into module-level
 * consts at import time, so env has to be set *before* the module evaluates.
 * Reset the registry and re-import for every case.
 */
async function loadR2(env: Record<string, string | undefined> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else vi.stubEnv(key, value);
  }
  return import("./r2");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// The validator that stops an attacker-chosen URL being stored and — because
// src/lib/federation.ts pushes audioUrl out to the hub — propagated to every
// federated instance. See the docblock at src/lib/r2.ts:45-58.
describe("isPublicUrlUnder", () => {
  it("accepts our own object directly under the prefix", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/abc-123.mp3`, PREFIX)).toBe(true);
  });

  it("accepts the full minted key alphabet — letters, digits, _ and -", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/UUID_1-2.MP3`, PREFIX)).toBe(true);
  });

  it("rejects a foreign origin", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`https://evil.com/songs/proj123/abc.mp3`, PREFIX)).toBe(false);
  });

  it("rejects an origin that merely starts with ours", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(
      isPublicUrlUnder("https://cdn.example.com.evil.com/songs/proj123/a.mp3", PREFIX),
    ).toBe(false);
  });

  it("rejects another project's prefix", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj999/abc.mp3`, PREFIX)).toBe(false);
  });

  // The prefix-bleed guarantee the docblock makes: because the remainder must be
  // a single slash-free segment, an artwork URL can't validate as audio.
  it("rejects a nested path under the prefix", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/artwork/abc.png`, PREFIX)).toBe(false);
  });

  it("rejects path traversal", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/../../etc/passwd.mp3`, PREFIX)).toBe(false);
  });

  it("rejects a query string or fragment appended to a valid key", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/abc.mp3?x=1`, PREFIX)).toBe(false);
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/abc.mp3#frag`, PREFIX)).toBe(false);
  });

  it("rejects malformed object names", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/a b.mp3`, PREFIX)).toBe(false);
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/noextension`, PREFIX)).toBe(false);
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/`, PREFIX)).toBe(false);
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/.mp3`, PREFIX)).toBe(false);
  });

  it("rejects an empty string", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder("", PREFIX)).toBe(false);
  });

  // src/lib/r2.ts:60 fails closed: with no configured public URL there is no
  // trusted origin to compare against, so nothing validates.
  it("rejects everything when R2_PUBLIC_URL is unset", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: undefined });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/abc.mp3`, PREFIX)).toBe(false);
    expect(isPublicUrlUnder("/songs/proj123/abc.mp3", PREFIX)).toBe(false);
    expect(isPublicUrlUnder("", "")).toBe(false);
  });

  // All four real call sites (account.ts, versions.ts, projects.ts, bands.ts)
  // pass a trailing slash. Without one the prefix runs into the object name and
  // the remainder keeps a leading slash, which the regex rejects.
  it("requires the caller's prefix to carry a trailing slash", async () => {
    const { isPublicUrlUnder } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(`${CDN}/songs/proj123/abc.mp3`, "songs/proj123")).toBe(false);
  });

  it("accepts what publicUrlFor produces, so the presign round trip validates", async () => {
    const { isPublicUrlUnder, publicUrlFor } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(isPublicUrlUnder(publicUrlFor("songs/p1/a.mp3"), "songs/p1/")).toBe(true);
  });
});

describe("R2_PUBLIC_URL normalization", () => {
  it("strips a single trailing slash", async () => {
    const r2 = await loadR2({ R2_PUBLIC_URL: `${CDN}/` });
    expect(r2.R2_PUBLIC_URL).toBe(CDN);
    expect(r2.publicUrlFor("a.mp3")).toBe(`${CDN}/a.mp3`);
  });

  it("leaves an already-bare URL alone", async () => {
    const r2 = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(r2.R2_PUBLIC_URL).toBe(CDN);
  });

  // Characterization: the regex is /\/$/, so it strips one slash, not a run.
  it("strips only one slash from a doubled trailing slash", async () => {
    const r2 = await loadR2({ R2_PUBLIC_URL: `${CDN}//` });
    expect(r2.R2_PUBLIC_URL).toBe(`${CDN}/`);
  });

  it("is an empty string when unset", async () => {
    const r2 = await loadR2({ R2_PUBLIC_URL: undefined });
    expect(r2.R2_PUBLIC_URL).toBe("");
  });
});

describe("publicUrlFor", () => {
  it("joins the public base to the object key", async () => {
    const { publicUrlFor } = await loadR2({ R2_PUBLIC_URL: CDN });
    expect(publicUrlFor("a.mp3")).toBe(`${CDN}/a.mp3`);
    expect(publicUrlFor("songs/x/a.mp3")).toBe(`${CDN}/songs/x/a.mp3`);
  });
});

describe("isR2Configured", () => {
  const ALL = {
    R2_ACCOUNT_ID: "acct",
    R2_ACCESS_KEY_ID: "key",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "bucket",
    R2_PUBLIC_URL: CDN,
  };

  it("is true when all five vars are present", async () => {
    const { isR2Configured } = await loadR2(ALL);
    expect(isR2Configured()).toBe(true);
  });

  it.each(Object.keys(ALL))("is false when %s is missing", async (missing) => {
    const { isR2Configured } = await loadR2({ ...ALL, [missing]: undefined });
    expect(isR2Configured()).toBe(false);
  });

  it("treats an empty string as missing", async () => {
    const { isR2Configured } = await loadR2({ ...ALL, R2_BUCKET: "" });
    expect(isR2Configured()).toBe(false);
  });
});
