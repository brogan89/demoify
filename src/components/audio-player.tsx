"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  initialDuration,
  onPlay,
}: {
  src: string;
  initialDuration?: number | null;
  onPlay?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(initialDuration ?? 0);

  // Reset playback state when the source changes (e.g. selecting a version).
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(initialDuration ?? 0);
  }, [src, initialDuration]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          onPlay?.();
        }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <Button
        type="button"
        size="icon"
        variant="default"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
        {fmt(current)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(current, duration || 0)}
        onChange={seek}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
        aria-label="Seek"
      />
      <span className="w-12 text-xs tabular-nums text-muted-foreground">
        {fmt(duration)}
      </span>
    </div>
  );
}
