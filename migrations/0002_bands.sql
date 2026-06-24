-- Bands as organizations + per-song visibility.
--
-- Turns the old "a band is a User" model into real organizations: a Band owns
-- the public URL handle, its songs, and its credit balance; users join bands
-- via band_membership with a role. Each existing user is backfilled into its
-- own band as ADMIN so nothing they own is lost.
--
-- IMPORTANT: D1 enforces foreign keys during migrations and ignores
-- `PRAGMA foreign_keys=OFF`, so DROP TABLE on a parent (user, song_project)
-- cascade-deletes its children. We therefore only ADD columns to those tables
-- and never rebuild them. credit_transaction has no children, so it's safe to
-- rebuild. user.username/credits columns are left in place (vestigial) because
-- Better Auth owns that table and username is NOT NULL + UNIQUE.

-- 1. New tables -------------------------------------------------------------
CREATE TABLE "band" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 150,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "band_membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "band_membership_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "band" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "band_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 2. Backfill: one band per existing user, that user as ADMIN ----------------
-- Deterministic ids ('band_'/'bm_' + user id) so the remaps below resolve.
INSERT INTO "band" ("id", "username", "displayName", "avatarUrl", "credits", "createdAt")
SELECT 'band_' || "id", "username", "displayName", "avatarUrl", "credits", "createdAt" FROM "user";

INSERT INTO "band_membership" ("id", "bandId", "userId", "role", "createdAt")
SELECT 'bm_' || "id", 'band_' || "id", "id", 'ADMIN', "createdAt" FROM "user";

-- 3. song_project: add bandId + visibility (ADD COLUMN, no rebuild) ----------
-- ownerId is kept as the creator; bandId is the owning org. The slug uniqueness
-- moves from (ownerId, slug) to (bandId, slug).
ALTER TABLE "song_project" ADD COLUMN "bandId" TEXT;
ALTER TABLE "song_project" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';
UPDATE "song_project" SET "bandId" = 'band_' || "ownerId";
DROP INDEX "song_project_ownerId_slug_key";
CREATE UNIQUE INDEX "song_project_bandId_slug_key" ON "song_project"("bandId", "slug");

-- 4. Rebuild credit_transaction: user -> band (safe: no child tables) --------
CREATE TABLE "new_credit_transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bandId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_transaction_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "band" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_credit_transaction" ("id", "bandId", "delta", "reason", "stripeSessionId", "createdAt")
SELECT "id", 'band_' || "userId", "delta", "reason", "stripeSessionId", "createdAt" FROM "credit_transaction";
DROP TABLE "credit_transaction";
ALTER TABLE "new_credit_transaction" RENAME TO "credit_transaction";
CREATE UNIQUE INDEX "credit_transaction_stripeSessionId_key" ON "credit_transaction"("stripeSessionId");
CREATE INDEX "credit_transaction_bandId_idx" ON "credit_transaction"("bandId");

-- 5. Indexes for the new tables ---------------------------------------------
CREATE UNIQUE INDEX "band_username_key" ON "band"("username");
CREATE UNIQUE INDEX "band_membership_bandId_userId_key" ON "band_membership"("bandId", "userId");
CREATE INDEX "band_membership_userId_idx" ON "band_membership"("userId");
