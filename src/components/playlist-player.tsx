"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Music4 } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { recordPlay } from "@/app/actions/plays";
import { cn } from "@/lib/utils";

export type PlaylistTrack = {
  projectId: string;
  title: string;
  bandName: string;
  path: string;
  audioUrl: string;
  duration: number | null;
};

export function PlaylistPlayer({ tracks }: { tracks: PlaylistTrack[] }) {
  const [index, setIndex] = useState(0);
  // Only auto-advance once the user has started playback (avoids autoplay on load).
  const [started, setStarted] = useState(false);
  const counted = useRef<Set<string>>(new Set());
  const current = tracks[index];

  function handlePlay() {
    setStarted(true);
    // Count one play per track per session, like SongView.
    if (current && !counted.current.has(current.projectId)) {
      counted.current.add(current.projectId);
      void recordPlay(current.projectId);
    }
  }

  function handleEnded() {
    if (index < tracks.length - 1) setIndex(index + 1);
  }

  function select(i: number) {
    setStarted(true);
    setIndex(i);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Now playing —{" "}
          <Link href={current.path} className="font-medium text-foreground hover:underline">
            {current.title}
          </Link>{" "}
          by {current.bandName}
        </p>
        <AudioPlayer
          src={current.audioUrl}
          initialDuration={current.duration}
          onPlay={handlePlay}
          onEnded={handleEnded}
          autoPlay={started}
        />
      </div>

      <ol className="divide-y rounded-lg border">
        {tracks.map((t, i) => {
          const active = i === index;
          return (
            <li key={t.projectId}>
              <button
                type="button"
                onClick={() => select(i)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  active ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <Music4
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t.bandName}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
