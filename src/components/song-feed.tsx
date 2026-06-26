"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Music4 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AudioPlayer, type AudioPlayerHandle } from "@/components/audio-player";
import { SongCard, SongStats, type SongCardData } from "@/components/song-card";
import { recordPlay, recordFullPlay } from "@/app/actions/plays";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * A single column of song cards, each playable inline (with the shared waveform)
 * and likeable, clicking through to the song page for comments and version
 * history. Used app-wide — Explore, band/artist pages, and Library — so song
 * listings look and behave identically everywhere. Federated cards have no local
 * version and fall back to SongCard's link-out. Playback is continuous — only one
 * song plays at a time and finishing a song auto-advances to the next playable one.
 */
export function SongFeed({
  entries,
  isAuthed,
}: {
  entries: SongCardData[];
  isAuthed: boolean;
}) {
  // The ordered list of playable (local) songs and a player ref per song, so we can
  // pause the others when one starts and advance to the next when one ends.
  const playable = entries.filter((e) => e.version);
  const playerRefs = useRef<Map<string, AudioPlayerHandle | null>>(new Map());

  // Lifetime play counts, bumped optimistically on first play of each song.
  const [plays, setPlays] = useState<Record<string, number>>(() =>
    Object.fromEntries(playable.map((e) => [e.id, e.playCount])),
  );
  // Count at most one play per song per session, so resume/seek don't inflate.
  const countedRef = useRef<Set<string>>(new Set());

  function handlePlay(id: string) {
    // Only one at a time: pause every other player.
    for (const [otherId, ref] of playerRefs.current) {
      if (otherId !== id) ref?.pause();
    }
    if (countedRef.current.has(id)) return;
    countedRef.current.add(id);
    setPlays((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
    void recordPlay(id);
  }

  function handleEnded(id: string) {
    void recordFullPlay(id).then((res) => {
      if (res.earned > 0) toast.success(`+${res.earned} credits for listening`);
    });
    // Auto-advance to the next playable song in the feed.
    const idx = playable.findIndex((e) => e.id === id);
    const next = playable[idx + 1];
    if (next) playerRefs.current.get(next.id)?.play();
  }

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
                </CardTitle>
                <Link
                  href={`/${card.band.username}`}
                  className="min-w-0 truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {card.band.displayName}
                </Link>
                <CardAction>
                  <SongStats
                    playCount={plays[card.id] ?? card.playCount}
                    likeCount={card.likeCount}
                    liked={card.liked}
                    isAuthed={isAuthed}
                    projectId={card.id}
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  ref={(h) => {
                    playerRefs.current.set(card.id, h);
                  }}
                  src={card.version.audioUrl}
                  initialDuration={card.version.duration}
                  onPlay={() => handlePlay(card.id)}
                  onEnded={() => handleEnded(card.id)}
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
