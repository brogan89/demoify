import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, isMember } from "@/lib/band";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SongFeed } from "@/components/song-feed";
import { type SongCardData } from "@/components/song-card";
import { SocialLinks } from "@/components/social-links";
import { parseSocialLinks } from "@/lib/socials";
import { TipButton } from "@/components/tip-button";
import { TipResultToast } from "@/components/tip-result-toast";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const band = await prisma.band.findUnique({
    where: { username },
    select: { displayName: true, bio: true },
  });
  if (!band) return { title: "Not found — Demoify" };
  return {
    title: `${band.displayName} · Demoify`,
    description: band.bio ?? `Listen to ${band.displayName} on Demoify.`,
  };
}

export default async function ArtistProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const [band, currentUser] = await Promise.all([
    prisma.band.findUnique({ where: { username } }),
    getCurrentUser(),
  ]);
  if (!band) notFound();

  const viewerId = currentUser?.id ?? "";
  // Members see this band's private songs too; everyone else only public.
  const role = currentUser ? await getMembership(band.id, currentUser.id) : null;
  const songs = await prisma.songProject.findMany({
    where: {
      bandId: band.id,
      versions: { some: {} },
      ...(isMember(role) ? {} : { visibility: "PUBLIC" }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      // Latest version powers inline playback in the feed.
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        select: { id: true, audioUrl: true, duration: true, versionNumber: true, uploadedAt: true },
      },
    },
  });

  const entries: SongCardData[] = songs.map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    playCount: s.playCount,
    likeCount: s._count.likes,
    commentCount: s._count.comments,
    liked: s.likes.length > 0,
    isPrivate: s.visibility === "PRIVATE",
    band: { username: band.username, displayName: band.displayName },
    version: { ...s.versions[0], uploadedAt: s.versions[0].uploadedAt.toISOString() },
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <TipResultToast bandName={band.displayName} />
      <header className="mb-8 flex items-start gap-4">
        <Avatar className="size-16">
          {band.avatarUrl && <AvatarImage src={band.avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(band.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{band.displayName}</h1>
              <p className="truncate font-mono text-xs text-muted-foreground">demoify.app/{band.username}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <TipButton
                bandId={band.id}
                bandDisplayName={band.displayName}
                returnPath={`/${band.username}`}
                isAuthed={Boolean(currentUser)}
                canTip={band.payoutsEnabled && !isMember(role)}
              />
              {isMember(role) && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/band">
                    <Pencil className="size-3.5" /> Edit profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
          {band.bio && <p className="mt-3 max-w-prose text-sm break-words text-muted-foreground">{band.bio}</p>}
          <SocialLinks links={parseSocialLinks(band.socialLinks)} />
        </div>
      </header>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Tracks{songs.length > 0 && ` (${songs.length})`}
      </h2>
      {songs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No public tracks yet.
        </p>
      ) : (
        <SongFeed entries={entries} isAuthed={Boolean(currentUser)} />
      )}
    </div>
  );
}
