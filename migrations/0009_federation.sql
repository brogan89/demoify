-- Federation — sharing public tracks across self-hosted instances.
--
-- A "hub" instance accepts track submissions from registered self-hosted
-- instances and surfaces approved ones in its Explore feed. Only metadata is
-- stored: the audio and the song/artist pages stay on the origin instance, so
-- nothing is copied or re-hosted here. Inert unless FEDERATION_HUB_ENABLED is set.
--
-- Two brand-new tables, no parent rebuild — safe under D1's foreign-key
-- enforcement (same additive pattern as 0008_tips).

CREATE TABLE "federated_instance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "federated_instance_baseUrl_key" ON "federated_instance"("baseUrl");

CREATE TABLE "external_track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "remoteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "artistUrl" TEXT NOT NULL,
    "trackUrl" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "genre" TEXT,
    "subgenre" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "external_track_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "federated_instance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "external_track_instanceId_remoteId_key" ON "external_track"("instanceId", "remoteId");
CREATE INDEX "external_track_status_genre_idx" ON "external_track"("status", "genre");
