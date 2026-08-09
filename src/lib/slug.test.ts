import { describe, expect, it } from "vitest";

import { isValidSlug, slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("MY SONG (Live!)")).toBe("my-song-live");
  });

  it("trims and collapses runs of separators", () => {
    expect(slugify("  spaced  out  ")).toBe("spaced-out");
    expect(slugify("foo---bar")).toBe("foo-bar");
    expect(slugify("-leading-and-trailing-")).toBe("leading-and-trailing");
  });

  it("strips diacritics rather than dropping the letters", () => {
    expect(slugify("Crème Brûlée")).toBe("creme-brulee");
    expect(slugify("Björk – Jóga")).toBe("bjork-joga");
  });

  it("keeps digits", () => {
    expect(slugify("Track 99 v2")).toBe("track-99-v2");
  });

  // Non-Latin scripts aren't transliterated, they're dropped entirely — which is
  // exactly why uniqueSlug needs its `|| "song"` fallback.
  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
    expect(slugify("🎵🎵")).toBe("");
    expect(slugify("Привет")).toBe("");
    expect(slugify("こんにちは")).toBe("");
  });

  it("truncates to 80 characters", () => {
    expect(slugify("a".repeat(100))).toBe("a".repeat(80));
  });

  // The 81st character being the separator used to slice a clean slug straight
  // back into a trailing hyphen, because .slice(0, 80) ran after the edge strip.
  it("truncates without slicing back into a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(79)} b`);
    expect(slug).toBe("a".repeat(79));
    expect(isValidSlug(slug)).toBe(true);
  });

  // The point of #9: slugify and isValidSlug must never disagree about what a
  // valid slug is. "" is the one legal exception — uniqueSlug's `|| "song"`
  // fallback (and its username equivalents) exist precisely to absorb it.
  it("only ever emits an empty string or a value isValidSlug accepts", () => {
    for (const input of [
      "",
      "!!!",
      "🎵🎵",
      "Привет",
      "-".repeat(100),
      " -x",
      "Hello World",
      "Crème Brûlée",
      "foo---bar",
      "-leading-and-trailing-",
      "a".repeat(100),
      `${"a".repeat(79)} b`, // 81st char is the separator
      "a ".repeat(60), // separator lands on the 80-char boundary
      `${"a".repeat(80)} b`,
    ]) {
      const out = slugify(input);
      expect(
        out === "" || isValidSlug(out),
        `slugify(${JSON.stringify(input)}) → ${JSON.stringify(out)}`,
      ).toBe(true);
    }
  });
});

describe("isValidSlug", () => {
  it("accepts lowercase alphanumeric groups joined by single hyphens", () => {
    expect(isValidSlug("abc")).toBe(true);
    expect(isValidSlug("a-b-c")).toBe(true);
    expect(isValidSlug("a1-2b")).toBe(true);
    expect(isValidSlug("99")).toBe(true);
  });

  it("rejects empty, edge-hyphenated, doubled-hyphen and uppercase values", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("abc-")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
    expect(isValidSlug("ABC")).toBe(false);
    expect(isValidSlug("a b")).toBe(false);
    expect(isValidSlug("a_b")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when it's free", () => {
    expect(uniqueSlug("My Song", new Set())).toBe("my-song");
  });

  it("appends -2, then -3, and so on", () => {
    expect(uniqueSlug("My Song", new Set(["my-song"]))).toBe("my-song-2");
    expect(uniqueSlug("My Song", new Set(["my-song", "my-song-2"]))).toBe("my-song-3");
    expect(uniqueSlug("My Song", new Set(["my-song", "my-song-2", "my-song-3"]))).toBe(
      "my-song-4",
    );
  });

  // It takes the first free slot rather than seeking past the highest suffix, so
  // a deleted song's slug gets reused.
  it("fills a gap rather than continuing past it", () => {
    expect(uniqueSlug("My Song", new Set(["my-song", "my-song-3"]))).toBe("my-song-2");
  });

  it("falls back to 'song' when the title slugifies to nothing", () => {
    expect(uniqueSlug("!!!", new Set())).toBe("song");
    expect(uniqueSlug("🎵", new Set())).toBe("song");
    expect(uniqueSlug("!!!", new Set(["song"]))).toBe("song-2");
  });

  it("only considers the given owner's taken set", () => {
    expect(uniqueSlug("My Song", new Set(["someone-elses-song"]))).toBe("my-song");
  });
});
