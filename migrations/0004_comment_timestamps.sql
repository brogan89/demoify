-- Timestamped comments: an optional playback position (whole seconds) a comment
-- is anchored to, so feedback can point at a moment in the track. Additive only --
-- a new nullable column, no table rebuild, so it's safe under D1's foreign-key
-- enforcement (the comment table's FKs stay intact).

ALTER TABLE "comment" ADD COLUMN "timestampSeconds" INTEGER;
