-- Grandfather existing users ahead of the email-verification write-gate.
--
-- Unverified accounts become read-only (see requireVerifiedUser in
-- src/lib/session.ts). Until now nothing in the app read `emailVerified`, and
-- verification was only enforced when RESEND_API_KEY happened to be set — so
-- real, long-standing users may sit at emailVerified = 0 through no fault of
-- their own. Locking them out on deploy day would be a regression, not a fix.
--
-- "Has content" is deliberately broad: band membership OR an uploaded song OR a
-- comment OR a like. A listener who has been commenting for months but never
-- created an artist profile is just as real a user as an uploader, and the
-- narrow "has uploaded" rule would silently demote them.
--
-- Bot accounts that registered but never did anything are NOT matched here, so
-- they still have to verify.
--
-- Pure UPDATE, no table rebuild — safe under D1's always-on foreign-key
-- enforcement (see the note in 0002_bands.sql). SQLite stores booleans as 0/1.

UPDATE "user"
SET "emailVerified" = 1
WHERE "emailVerified" = 0
  AND (
    "id" IN (SELECT "userId" FROM "band_membership")
    OR "id" IN (SELECT "ownerId" FROM "song_project")
    OR "id" IN (SELECT "authorId" FROM "comment")
    OR "id" IN (SELECT "userId" FROM "song_like")
  );
