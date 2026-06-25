import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, isMember } from "@/lib/band";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SongCard } from "@/components/song-card";
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
  const [songs, role] = await Promise.all([
    prisma.songProject.findMany({
      where: { bandId: band.id, visibility: "PUBLIC", versions: { some: {} } },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { likes: true } },
        likes: { where: { userId: viewerId }, select: { id: true } },
      },
    }),
    currentUser ? getMembership(band.id, currentUser.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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
              <p className="font-mono text-xs text-muted-foreground">demoify.app/{band.username}</p>
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
          {band.bio && <p className="mt-3 max-w-prose text-sm text-muted-foreground">{band.bio}</p>}
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
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((s) => (
            <li key={s.id}>
              <SongCard
                song={{
                  id: s.id,
                  title: s.title,
                  slug: s.slug,
                  playCount: s.playCount,
                  likeCount: s._count.likes,
                  liked: s.likes.length > 0,
                  band: { username: band.username, displayName: band.displayName },
                }}
                isAuthed={Boolean(currentUser)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
