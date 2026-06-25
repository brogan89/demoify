import Link from "next/link";
import { Globe, Music4, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LikeButton } from "@/components/like-button";

export type SongCardData = {
  id: string;
  title: string;
  slug: string;
  playCount: number;
  likeCount: number;
  liked: boolean;
  band: { username: string; displayName: string };
  // Set for federated tracks mirrored from another instance. When present the
  // card links out to the origin site (where playback lives) and likes are
  // disabled — there's no local song to like.
  external?: { trackUrl: string; artistUrl: string; originName: string };
};

/** A public song tile used by Explore and artist profile pages. */
export function SongCard({ song, isAuthed }: { song: SongCardData; isAuthed: boolean }) {
  const ext = song.external;
  const trackHref = ext ? ext.trackUrl : `/${song.band.username}/${song.slug}`;
  const artistHref = ext ? ext.artistUrl : `/${song.band.username}`;

  // Federated cards point at another origin, so use plain anchors that open in a
  // new tab; local cards use Next's client-side Link.
  const TitleLink = ext
    ? (
        <a href={trackHref} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
          {song.title}
        </a>
      )
    : (
        <Link href={trackHref} className="truncate hover:underline">
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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Music4 className="size-4 shrink-0 text-primary" />
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
      </CardHeader>
      <CardContent className="mt-auto flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {ArtistLink}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs" title="Plays">
            <Play className="size-3 fill-current" />
            {song.playCount.toLocaleString()}
          </span>
          {ext ? (
            // No local song to like; show the count statically.
            <span className="flex items-center gap-1 text-xs" title="Likes">
              ♥ {song.likeCount.toLocaleString()}
            </span>
          ) : (
            <LikeButton
              projectId={song.id}
              initialLiked={song.liked}
              initialCount={song.likeCount}
              isAuthed={isAuthed}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
