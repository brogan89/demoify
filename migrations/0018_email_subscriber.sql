-- Launch-updates email list.
--
-- The marketing plan calls the email list "the one owned channel" — the only
-- audience that survives a subreddit ban, an algorithm change, or a dead
-- Product Hunt listing. Target is 100+ addresses before launch day.
--
-- Not a User row: these people have not asked for an account, and creating one
-- for them would both be dishonest and pollute the signup metrics the same plan
-- is trying to measure. Separate table, no relation.
--
-- `email` is UNIQUE and written lowercased/trimmed by the action, so a
-- double-submit is an idempotent no-op rather than a duplicate row. `refSource`
-- mirrors user.refSource (migration 0017) so list growth can be attributed to a
-- channel too.
--
-- New table with no foreign keys — nothing to rebuild, safe under D1's
-- always-on foreign-key enforcement.

CREATE TABLE "email_subscriber" (
    "id"        TEXT NOT NULL PRIMARY KEY,
    "email"     TEXT NOT NULL,
    "refSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "email_subscriber_email_key" ON "email_subscriber"("email");
