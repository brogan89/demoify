-- Optional song cover art: a public R2 object URL (key under
-- songs/<projectId>/artwork/, so deleteProject's existing prefix purge cleans
-- it up on song deletion). Everywhere a sleeve renders, display falls back:
-- artworkUrl -> band.avatarUrl (artist logo) -> generated gradient
-- (src/components/art-tile.tsx). Null means "no uploaded art", not "no sleeve".
--
-- Additive nullable column, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as 0014_song_version_peaks.sql).

ALTER TABLE "song_project" ADD COLUMN "artworkUrl" TEXT;
