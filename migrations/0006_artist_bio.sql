-- Artist profiles: a short bio shown on the public profile page (/[username]).
-- Additive nullable column, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as 0004 / 0005).

ALTER TABLE "band" ADD COLUMN "bio" TEXT;
