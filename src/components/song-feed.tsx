"use client";

import Link from "next/link";
import { Music4 } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivateBadge, SongCard, SongStats, type SongCardData } from "@/components/song-card";
import { TrackPlayer } from "@/components/player/track-player";
import { usePlayer, type Track } from "@/components/player/player-provider";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toTrack(card: SongCardData): Track {
  const v = card.version!;
  return {
    projectId: card.id,
    versionId: v.id,
    audioUrl: v.audioUrl,
    duration: v.duration,
    title: card.title,
    slug: card.slug,
    band: card.band,
  };
}

/**
 * A single column of song cards, each playable inline (with the shared waveform)
 * and likeable, clicking through to the song page for comments and version
 * history. Used app-wide — Explore, band/artist pages, and Library — so song
 * listings look and behave identically everywhere. Federated cards have no local
 * version and fall back to SongCard's link-out. Playback is handled by the global
 * player ({@link PlayerProvider}): playing a card queues the rest of the feed, only
 * one song plays at a time, and finishing one auto-advances to the next — all of
 * which persists in the bottom bar as the user navigates away.
 */
export function SongFeed({
  entries,
  isAuthed,
}: {
  entries: SongCardData[];
  isAuthed: boolean;
}) {
  const { playQueue, playCountFor } = usePlayer();

  // The ordered list of playable (local) songs becomes the queue when one starts.
  const playable = entries.filter((e) => e.version);
  const tracks = playable.map(toTrack);
  const indexById = new Map(playable.map((e, i) => [e.id, i]));

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((card) => (
        <li key={`${card.external ? "ext" : "loc"}-${card.id}`}>
          {card.version ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Music4 className="size-4 shrink-0 text-primary" />
                  <Link
                    href={`/${card.band.username}/${card.slug}`}
                    className="min-w-0 truncate hover:underline"
                  >
                    {card.title}
                  </Link>
                  <span
                    className="shrink-0 text-xs font-normal text-muted-foreground"
                    title={`Updated ${fmtDate(card.version.uploadedAt)}`}
                  >
                    v{card.version.versionNumber} · {fmtDate(card.version.uploadedAt)}
                  </span>
                  {card.isPrivate && <PrivateBadge />}
                </CardTitle>
                <Link
                  href={`/${card.band.username}`}
                  className="min-w-0 truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {card.band.displayName}
                </Link>
                <CardAction>
                  <SongStats
                    playCount={playCountFor(card.id, card.playCount)}
                    likeCount={card.likeCount}
                    commentCount={card.commentCount}
                    liked={card.liked}
                    isAuthed={isAuthed}
                    projectId={card.id}
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <TrackPlayer
                  track={tracks[indexById.get(card.id)!]}
                  onStart={(startAt) =>
                    playQueue(
                      tracks,
                      indexById.get(card.id)!,
                      startAt != null ? { startAt } : undefined,
                    )
                  }
                />
              </CardContent>
            </Card>
          ) : (
            // Federated track: no local version to play — link out to the origin.
            <SongCard song={card} isAuthed={isAuthed} />
          )}
        </li>
      ))}
    </ul>
  );
}
