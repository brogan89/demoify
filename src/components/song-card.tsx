import Link from "next/link";
import { Globe, Heart, Lock, MessageCircle, Play } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LikeButton } from "@/components/like-button";
import { ArtTile } from "@/components/art-tile";

export type SongCardData = {
  id: string;
  title: string;
  slug: string;
  playCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  // True for a band's private songs — only ever sent to that band's members (see the
  // feed queries), surfaced with a Private badge so they're distinguishable.
  isPrivate: boolean;
  band: { username: string; displayName: string };
  // Latest playable version, for inline playback in the Explore feed. Absent on
  // federated cards (which link out to their origin instead) — see SongFeed.
  // `uploadedAt` is an ISO string (Dates aren't serializable to Client Components).
  version?: {
    id: string;
    audioUrl: string;
    duration: number | null;
    // Stored waveform peaks, parsed server-side (null for legacy versions).
    peaks: number[] | null;
    versionNumber: number;
    uploadedAt: string;
  };
  // Set for federated tracks mirrored from another instance. When present the
  // card links out to the origin site (where playback lives) and likes are
  // disabled — there's no local song to like.
  external?: { trackUrl: string; artistUrl: string; originName: string };
};

/** Small pill marking a private song, shown only to the band's own members. */
export function PrivateBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs font-normal text-muted-foreground"
      title="Only visible to your band"
    >
      <Lock className="size-3" />
      Private
    </span>
  );
}

/**
 * Plays + like, shown in the top-right of a song card's header (the `CardAction`
 * slot). Shared by SongCard and the Explore feed so the stats look identical
 * everywhere. For federated tracks (`external`) there's no local song to like, so
 * the like count is shown statically. `playCount` is passed already-resolved so
 * callers can feed an optimistic count (the Explore feed bumps it on play).
 */
export function SongStats({
  playCount,
  likeCount,
  commentCount,
  liked,
  isAuthed,
  projectId,
  external,
}: {
  playCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  isAuthed: boolean;
  projectId: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-1" title="Plays">
        <Play className="size-3 fill-current" />
        {playCount.toLocaleString("en-US")}
      </span>
      <span className="flex items-center gap-1" title="Comments">
        <MessageCircle className="size-3" />
        {commentCount.toLocaleString("en-US")}
      </span>
      {external ? (
        <span className="flex items-center gap-1" title="Likes">
          <Heart className="size-3 fill-current" />
          {likeCount.toLocaleString("en-US")}
        </span>
      ) : (
        <LikeButton
          projectId={projectId}
          initialLiked={liked}
          initialCount={likeCount}
          isAuthed={isAuthed}
        />
      )}
    </div>
  );
}

/** A public song tile used by Explore and artist profile pages. */
export function SongCard({ song, isAuthed }: { song: SongCardData; isAuthed: boolean }) {
  const ext = song.external;
  const trackHref = ext ? ext.trackUrl : `/${song.band.username}/${song.slug}`;
  const artistHref = ext ? ext.artistUrl : `/${song.band.username}`;

  // Federated cards point at another origin, so use plain anchors that open in a
  // new tab; local cards use Next's client-side Link.
  const TitleLink = ext
    ? (
        <a
          href={trackHref}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate transition-colors hover:text-primary"
        >
          {song.title}
        </a>
      )
    : (
        <Link href={trackHref} className="truncate transition-colors hover:text-primary">
          {song.title}
        </Link>
      );

  const ArtistLink = ext
    ? (
        <a
          href={artistHref}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 truncate hover:text-foreground hover:underline"
        >
          {song.band.displayName}
        </a>
      )
    : (
        <Link href={artistHref} className="min-w-0 truncate hover:text-foreground hover:underline">
          {song.band.displayName}
        </Link>
      );

  return (
    <Card className="flex h-full flex-col transition-shadow duration-300 hover:ring-foreground/20">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <ArtTile seed={song.id} size="md" />
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {TitleLink}
            </CardTitle>
            {ext && (
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                title={`Shared from ${ext.originName}`}
              >
                <Globe className="size-3" />
                via {ext.originName}
              </span>
            )}
          </div>
        </div>
        <CardAction className="max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-2 max-sm:justify-self-start">
          <SongStats
            playCount={song.playCount}
            likeCount={song.likeCount}
            commentCount={song.commentCount}
            liked={song.liked}
            isAuthed={isAuthed}
            projectId={song.id}
            external={Boolean(ext)}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="mt-auto flex text-sm text-muted-foreground">
        {ArtistLink}
      </CardContent>
    </Card>
  );
}
