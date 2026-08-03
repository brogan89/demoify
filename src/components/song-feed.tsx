"use client";

import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivateBadge, SongCard, SongStats, type SongCardData } from "@/components/song-card";
import { TrackPlayer } from "@/components/player/track-player";
import { usePlayer, type Track } from "@/components/player/player-provider";
import { ArtTile, Equalizer } from "@/components/art-tile";

function fmtDate(iso: string): string {
  // Pin locale + timeZone so the server and client render identical text — a
  // locale/zone-dependent format causes React hydration mismatches.
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function toTrack(card: SongCardData): Track {
  const v = card.version!;
  return {
    projectId: card.id,
    versionId: v.id,
    audioUrl: v.audioUrl,
    duration: v.duration,
    peaks: v.peaks,
    title: card.title,
    slug: card.slug,
    band: card.band,
    artUrl: card.artUrl,
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
  // `playing`/`isActive` change only on play/pause/track-switch — never per
  // playhead tick (that lives in PlayerTimeContext, which this list must not
  // subscribe to, or every card re-renders 4×/second).
  const { playQueue, playCountFor, isActive, playing } = usePlayer();

  // The ordered list of playable (local) songs becomes the queue when one starts.
  const playable = entries.filter((e) => e.version);
  const tracks = playable.map(toTrack);
  const indexById = new Map(playable.map((e, i) => [e.id, i]));

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((card) => {
        const active = Boolean(card.version) && isActive(card.id);
        return (
          <li key={`${card.external ? "ext" : "loc"}-${card.id}`}>
            {card.version ? (
              <Card
                data-active={active ? "" : undefined}
                className="transition-shadow duration-300 hover:ring-foreground/20 data-active:ring-primary/40 data-active:shadow-glow-sm"
              >
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <ArtTile seed={card.id} size="md" src={card.artUrl}>
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <Equalizer playing={playing} className="h-4 text-white" />
                        </span>
                      )}
                    </ArtTile>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Link
                          href={`/${card.band.username}/${card.slug}`}
                          className="min-w-0 truncate transition-colors hover:text-primary"
                        >
                          {card.title}
                        </Link>
                        <span
                          className="shrink-0 text-xs font-normal text-muted-foreground"
                          title={`Updated ${fmtDate(card.version.uploadedAt)}`}
                        >
                          v{card.version.versionNumber}
                          {/* The date is secondary — drop it on phones so the
                              title keeps the room (it lives on the song page). */}
                          <span className="hidden sm:inline">
                            {" "}
                            · {fmtDate(card.version.uploadedAt)}
                          </span>
                        </span>
                        {card.isPrivate && <PrivateBadge />}
                      </CardTitle>
                      <Link
                        href={`/${card.band.username}`}
                        className="block min-w-0 truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {card.band.displayName}
                      </Link>
                    </div>
                  </div>
                  {/* On phones the stats drop to their own row so the title
                      keeps the width; from sm they sit top-right as usual. */}
                  <CardAction className="max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-2 max-sm:justify-self-start">
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
        );
      })}
    </ul>
  );
}
