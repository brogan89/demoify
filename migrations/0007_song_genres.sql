-- Song genres: an optional curated genre + subgenre per song (see
-- src/lib/genres.ts), powering the Explore filter. Both are nullable so existing
-- songs stay ungenred until edited. Additive columns + a new index, no table
-- rebuild — safe under D1's foreign-key enforcement (same pattern as 0006).

ALTER TABLE "song_project" ADD COLUMN "genre" TEXT;
ALTER TABLE "song_project" ADD COLUMN "subgenre" TEXT;

CREATE INDEX "song_project_genre_idx" ON "song_project" ("genre");
