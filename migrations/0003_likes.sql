-- Likes: a user's liked songs power the /library playlist and the Explore
-- "Popular" sort. Additive only — a new leaf table, no parent rebuild, so it's
-- safe under D1's foreign-key enforcement.

CREATE TABLE "song_like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "song_like_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "song_project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "song_like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "song_like_projectId_userId_key" ON "song_like"("projectId", "userId");
CREATE INDEX "song_like_userId_idx" ON "song_like"("userId");
