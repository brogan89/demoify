-- AlterTable
ALTER TABLE "song_project" ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_projectId_idx" ON "comment"("projectId");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "song_project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "song_version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
