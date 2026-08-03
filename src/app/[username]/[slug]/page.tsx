import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getMembership, isMember, canManageSongs } from "@/lib/band";
import { SongView, type VersionDTO } from "@/components/song-view";
import { type CommentDTO } from "@/components/comments";
import { parsePeaksJson } from "@/lib/waveform";
import { Button } from "@/components/ui/button";
import { ShareLink } from "@/components/share-link";
import { LikeButton } from "@/components/like-button";
import { TipButton } from "@/components/tip-button";
import { TipResultToast } from "@/components/tip-result-toast";
import { ArtTile } from "@/components/art-tile";

async function getProject(username: string, slug: string) {
  return prisma.songProject.findFirst({
    where: { slug, band: { username } },
    include: {
      band: {
        select: {
          id: true,
          username: true,
          displayName: true,
          payoutsEnabled: true,
          avatarUrl: true,
        },
      },
      _count: { select: { likes: true } },
      versions: { orderBy: { versionNumber: "desc" } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, displayName: true, avatarUrl: true } },
          version: { select: { versionNumber: true } },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}): Promise<Metadata> {
  const { username, slug } = await params;
  const project = await getProject(username, slug);
  if (!project || project.visibility === "PRIVATE") {
    return { title: "Not found — Demoify" };
  }
  const title = `${project.title} — ${project.band.displayName}`;
  return {
    title: `${title} · Demoify`,
    description: project.description ?? `Listen to ${project.title} on Demoify.`,
    openGraph: { title, description: project.description ?? undefined },
  };
}

export default async function PublicSongPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const [project, currentUser] = await Promise.all([
    getProject(username, slug),
    getCurrentUser(),
  ]);
  if (!project) notFound();

  const currentUserId = currentUser?.id ?? null;
  const role = currentUser ? await getMembership(project.bandId, currentUser.id) : null;
  const isPrivate = project.visibility === "PRIVATE";

  // Private songs are only visible to band members.
  if (isPrivate && !isMember(role)) notFound();

  const versions: VersionDTO[] = project.versions.map((v) => ({
    id: v.id,
    versionNumber: v.versionNumber,
    audioUrl: v.audioUrl,
    changelog: v.changelog,
    duration: v.duration,
    peaks: parsePeaksJson(v.peaks),
    uploadedAt: v.uploadedAt.toISOString(),
  }));

  const comments: CommentDTO[] = project.comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    versionId: c.versionId,
    versionNumber: c.version.versionNumber,
    timestampSeconds: c.timestampSeconds,
    authorId: c.authorId,
    authorName: c.author.displayName,
    authorAvatarUrl: c.author.avatarUrl,
  }));

  // Public songs: any logged-in user can comment. Private: members only (already gated).
  const canComment = Boolean(currentUserId) && (!isPrivate || isMember(role));
  const canModerate = canManageSongs(role);

  // Likes are public-only. Seed the button with the viewer's current like state.
  const likedByUser =
    !isPrivate && currentUser
      ? (await prisma.like.findUnique({
          where: { projectId_userId: { projectId: project.id, userId: currentUser.id } },
          select: { id: true },
        })) !== null
      : false;

  // Sleeve image: uploaded artwork, else the band's logo, else the gradient.
  const artUrl = project.artworkUrl ?? project.band.avatarUrl;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-start gap-4">
        <ArtTile seed={project.id} size="lg" src={artUrl} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight break-words md:text-4xl">
            {project.title}
            {isPrivate && (
              <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="Private" />
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            by{" "}
            <Link
              href={`/${project.band.username}`}
              className="transition-colors hover:text-foreground hover:underline"
            >
              {project.band.displayName}
            </Link>
          </p>
          {project.description && (
            <p className="mt-2 max-w-prose text-sm break-words text-muted-foreground">
              {project.description}
            </p>
          )}
          {project.genre && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Link
                href={`/explore?${new URLSearchParams({ genre: project.genre })}`}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary transition-colors hover:bg-primary/20"
              >
                {project.genre}
              </Link>
              {project.subgenre && (
                <Link
                  href={`/explore?${new URLSearchParams({
                    genre: project.genre,
                    subgenre: project.subgenre,
                  })}`}
                  className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary transition-colors hover:bg-primary/20"
                >
                  {project.subgenre}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <TipResultToast bandName={project.band.displayName} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <ShareLink path={`${project.band.username}/${slug}`} />
        {!isPrivate && (
          <LikeButton
            projectId={project.id}
            initialLiked={likedByUser}
            initialCount={project._count.likes}
            isAuthed={Boolean(currentUser)}
          />
        )}
        {!isPrivate && (
          <TipButton
            bandId={project.band.id}
            bandDisplayName={project.band.displayName}
            projectId={project.id}
            returnPath={`/${project.band.username}/${slug}`}
            isAuthed={Boolean(currentUser)}
            canTip={project.band.payoutsEnabled && !isMember(role)}
          />
        )}
        {isMember(role) && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/dashboard/${project.id}`}>
              <Pencil className="size-3.5" /> Edit song
            </Link>
          </Button>
        )}
      </div>

      <SongView
        versions={versions}
        projectId={project.id}
        title={project.title}
        slug={project.slug}
        band={{
          username: project.band.username,
          displayName: project.band.displayName,
        }}
        artUrl={artUrl}
        playCount={project.playCount}
        comments={comments}
        currentUserId={currentUserId}
        canComment={canComment}
        canModerate={canModerate}
      />
    </div>
  );
}
