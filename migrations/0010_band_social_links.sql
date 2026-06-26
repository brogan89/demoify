-- Band social/website links: a JSON object map of `{ [platformKey]: url }`
-- shown on the public profile page (/[username]). See src/lib/socials.ts.
-- Additive nullable column, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as 0006_artist_bio.sql).

ALTER TABLE "band" ADD COLUMN "socialLinks" TEXT;
