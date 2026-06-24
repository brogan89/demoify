import Link from "next/link";
import { Music4, Play } from "lucide-react";
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
};

/** A public song tile used by Explore and artist profile pages. */
export function SongCard({ song, isAuthed }: { song: SongCardData; isAuthed: boolean }) {
  const path = `/${song.band.username}/${song.slug}`;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Music4 className="size-4 shrink-0 text-primary" />
          <Link href={path} className="truncate hover:underline">
            {song.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <Link
          href={`/${song.band.username}`}
          className="min-w-0 truncate hover:text-foreground hover:underline"
        >
          {song.band.displayName}
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs" title="Plays">
            <Play className="size-3 fill-current" />
            {song.playCount.toLocaleString()}
          </span>
          <LikeButton
            projectId={song.id}
            initialLiked={song.liked}
            initialCount={song.likeCount}
            isAuthed={isAuthed}
          />
        </div>
      </CardContent>
    </Card>
  );
}
