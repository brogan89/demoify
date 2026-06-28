"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerControls } from "@/components/player/player-controls";
import { usePlayer, usePlayerTime } from "@/components/player/player-provider";

/**
 * The persistent bottom player. Mounted once in the root layout so playback — and
 * these controls — survive route changes (SoundCloud-style). Hidden until a track
 * is loaded; reflects and controls the same audio as the active feed card.
 */
export function PlayerBar() {
  const { current, playing, duration, toggle, seek, dismiss } = usePlayer();
  const currentTime = usePlayerTime();

  if (!current) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline gap-2 text-sm">
            <Link
              href={`/${current.band.username}/${current.slug}`}
              className="min-w-0 truncate font-medium hover:underline"
            >
              {current.title}
            </Link>
            <span className="text-muted-foreground">—</span>
            <Link
              href={`/${current.band.username}`}
              className="min-w-0 truncate text-muted-foreground hover:text-foreground hover:underline"
            >
              {current.band.displayName}
            </Link>
          </div>
          <PlayerControls
            src={current.audioUrl}
            playing={playing}
            currentTime={currentTime}
            duration={duration || (current.duration ?? 0)}
            onToggle={toggle}
            onSeek={seek}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={dismiss}
          aria-label="Close player"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
