"use client";

import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/waveform";
import { cn } from "@/lib/utils";

export function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Presentational transport: play/pause, elapsed/total time and the interactive
 * waveform. Owns no audio element — the global player ({@link PlayerProvider})
 * drives it via props, so both the feed cards and the persistent bottom bar render
 * the same control.
 */
export function PlayerControls({
  src,
  playing,
  currentTime,
  duration,
  onToggle,
  onSeek,
  className,
}: {
  src: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        size="icon"
        variant="default"
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {fmtTime(currentTime)}
      </span>
      <div className="flex-1">
        <Waveform
          key={src}
          src={src}
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          fallback={
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-primary"
              aria-label="Seek"
            />
          }
        />
      </div>
      <span className="w-12 text-xs tabular-nums text-muted-foreground">
        {fmtTime(duration)}
      </span>
    </div>
  );
}
