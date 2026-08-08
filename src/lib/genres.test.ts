import { describe, expect, it } from "vitest";

import { GENRES, GENRE_NAMES, getSubgenres, normalizeGenre } from "./genres";

// normalizeGenre is the single source of truth for what gets stored on
// SongProject and what the Explore filter queries, and it also cleans federated
// track ingestion. A regression here corrupts rows rather than just the UI.
describe("normalizeGenre", () => {
  it("keeps a valid genre + subgenre pair", () => {
    expect(normalizeGenre("Rock", "Shoegaze")).toEqual({
      genre: "Rock",
      subgenre: "Shoegaze",
    });
  });

  it("clears a subgenre that belongs to a different genre, keeping the genre", () => {
    expect(normalizeGenre("Rock", "Techno")).toEqual({ genre: "Rock", subgenre: null });
  });

  it("clears a missing subgenre but keeps the genre", () => {
    expect(normalizeGenre("Rock", "")).toEqual({ genre: "Rock", subgenre: null });
    expect(normalizeGenre("Rock", null)).toEqual({ genre: "Rock", subgenre: null });
    expect(normalizeGenre("Rock", undefined)).toEqual({ genre: "Rock", subgenre: null });
  });

  // An unknown genre nulls the subgenre too — a subgenre without its parent
  // would be unreachable from every dropdown and filter.
  it("nulls both when the genre is unknown", () => {
    expect(normalizeGenre("Nonexistent", "Shoegaze")).toEqual({
      genre: null,
      subgenre: null,
    });
    expect(normalizeGenre("", "Shoegaze")).toEqual({ genre: null, subgenre: null });
    expect(normalizeGenre(null, null)).toEqual({ genre: null, subgenre: null });
    expect(normalizeGenre(undefined, undefined)).toEqual({ genre: null, subgenre: null });
  });

  it("trims surrounding whitespace on both values", () => {
    expect(normalizeGenre("  Rock  ", "  Shoegaze  ")).toEqual({
      genre: "Rock",
      subgenre: "Shoegaze",
    });
  });

  // Labels are stored verbatim, so matching is case-sensitive. Worth pinning:
  // a well-meaning "just lowercase it" change would silently drop every genre.
  it("is case-sensitive — labels are stored verbatim", () => {
    expect(normalizeGenre("rock", "Shoegaze")).toEqual({ genre: null, subgenre: null });
    expect(normalizeGenre("ROCK", "Shoegaze")).toEqual({ genre: null, subgenre: null });
  });

  // The label most likely to break a future "sanitize the genre string" change.
  it("passes through labels containing & and /", () => {
    expect(normalizeGenre("R&B / Soul", "Neo-Soul")).toEqual({
      genre: "R&B / Soul",
      subgenre: "Neo-Soul",
    });
  });
});

describe("getSubgenres", () => {
  it("returns the subgenres of a known genre, in order", () => {
    expect(getSubgenres("Electronic")).toEqual([
      "House",
      "Techno",
      "Ambient",
      "Drum & Bass",
      "Synthwave",
      "IDM",
    ]);
  });

  it("returns [] for unknown or missing input", () => {
    expect(getSubgenres("Nonexistent")).toEqual([]);
    expect(getSubgenres("")).toEqual([]);
    expect(getSubgenres(null)).toEqual([]);
    expect(getSubgenres(undefined)).toEqual([]);
  });
});

// "Keep labels stable — renaming one orphans existing rows that stored the old
// label" (src/lib/genres.ts:4-5). These guard the shape of the taxonomy itself.
describe("the taxonomy", () => {
  it("has no duplicate genre names", () => {
    expect(new Set(GENRE_NAMES).size).toBe(GENRE_NAMES.length);
  });

  it("gives every genre at least one subgenre, with no duplicates within it", () => {
    for (const genre of GENRES) {
      expect(genre.subgenres.length).toBeGreaterThan(0);
      expect(new Set(genre.subgenres).size).toBe(genre.subgenres.length);
    }
  });

  it("keeps GENRE_NAMES in sync with GENRES, in display order", () => {
    expect(GENRE_NAMES).toEqual(GENRES.map((g) => g.name));
  });
});
