import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { PlaylistPlayer, type PlaylistTrack } from "@/components/playlist-player";

export const metadata: Metadata = {
  title: "Library · Demoify",
  description: "Your liked songs.",
};

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Liked songs that are still public and playable, newest-liked first.
  const likes = await prisma.like.findMany({
    where: { userId: user.id, project: { visibility: "PUBLIC", versions: { some: {} } } },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: {
          band: { select: { username: true, displayName: true } },
          versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        },
      },
    },
  });

  const tracks: PlaylistTrack[] = likes.map((l) => ({
    projectId: l.project.id,
    title: l.project.title,
    bandName: l.project.band.displayName,
    path: `/${l.project.band.username}/${l.project.slug}`,
    audioUrl: l.project.versions[0].audioUrl,
    duration: l.project.versions[0].duration,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Heart className="size-7 fill-current text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Your library</h1>
          <p className="text-sm text-muted-foreground">
            {tracks.length} liked song{tracks.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No liked songs yet. Find some on{" "}
          <Link href="/explore" className="text-primary underline-offset-4 hover:underline">
            Explore
          </Link>
          .
        </p>
      ) : (
        <PlaylistPlayer tracks={tracks} />
      )}
    </div>
  );
}
