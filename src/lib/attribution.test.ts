import { describe, expect, it } from "vitest";
import {
  REF_MAX_LENGTH,
  normalizeRefSource,
  readRefParam,
} from "./attribution";

describe("normalizeRefSource", () => {
  it("passes through the tags the launch plan actually hands out", () => {
    expect(normalizeRefSource("reddit_musicproduction")).toBe("reddit_musicproduction");
    expect(normalizeRefSource("hn")).toBe("hn");
    expect(normalizeRefSource("product-hunt")).toBe("product-hunt");
  });

  it("groups case and whitespace variants as one channel", () => {
    // The whole point is a ranking, and "Reddit" splitting from "reddit" would
    // quietly halve a channel's apparent performance.
    expect(normalizeRefSource("Reddit")).toBe("reddit");
    expect(normalizeRefSource("  reddit  ")).toBe("reddit");
    expect(normalizeRefSource("REDDIT")).toBe("reddit");
  });

  it("collapses disallowed characters into a single separator", () => {
    expect(normalizeRefSource("reddit / r-musicproduction")).toBe(
      "reddit_r-musicproduction",
    );
    expect(normalizeRefSource("a@@@b")).toBe("a_b");
  });

  it("strips markup rather than storing it", () => {
    // This value reaches an admin table; it must not arrive as markup.
    const out = normalizeRefSource("<script>alert(1)</script>");
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).toBe("script_alert_1_script");
  });

  it("caps length and never ends on a separator", () => {
    const out = normalizeRefSource("x".repeat(200));
    expect(out).toHaveLength(REF_MAX_LENGTH);

    // A slice landing mid-separator would otherwise leave a dangling "_".
    const sliced = normalizeRefSource(`${"y".repeat(REF_MAX_LENGTH - 1)}___zzz`);
    expect(sliced?.endsWith("_")).toBe(false);
  });

  it("returns null for nothing usable", () => {
    expect(normalizeRefSource(null)).toBeNull();
    expect(normalizeRefSource(undefined)).toBeNull();
    expect(normalizeRefSource("")).toBeNull();
    expect(normalizeRefSource("   ")).toBeNull();
    expect(normalizeRefSource("___")).toBeNull();
    expect(normalizeRefSource("!!!")).toBeNull();
  });
});

describe("readRefParam", () => {
  it("reads ref", () => {
    expect(readRefParam(new URLSearchParams("ref=reddit"))).toBe("reddit");
  });

  it("falls back to utm_source", () => {
    expect(readRefParam(new URLSearchParams("utm_source=newsletter"))).toBe("newsletter");
  });

  it("prefers ref over utm_source when both are present", () => {
    const params = new URLSearchParams("utm_source=google&ref=reddit");
    expect(readRefParam(params)).toBe("reddit");
  });

  it("returns null when neither is present or usable", () => {
    expect(readRefParam(new URLSearchParams("q=hello"))).toBeNull();
    expect(readRefParam(new URLSearchParams("ref="))).toBeNull();
  });
});
