"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const BARS = 160;

// Decoded peak arrays are cached per source URL so re-renders (and re-mounts when
// switching tracks back and forth) don't re-fetch and re-decode the whole file.
const peakCache = new Map<string, number[]>();

// Reduce raw PCM samples down to `BARS` normalized peaks (0..1).
function computePeaks(buffer: AudioBuffer): number[] {
  const channel = buffer.getChannelData(0);
  const block = Math.floor(channel.length / BARS) || 1;
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < BARS; i++) {
    let peak = 0;
    const start = i * block;
    for (let j = 0; j < block && start + j < channel.length; j++) {
      const v = Math.abs(channel[start + j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  // Normalize so the loudest bar is full-height regardless of overall gain.
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/**
 * Renders the real waveform of `src` with a played/unplayed split and
 * click-to-seek. Shows `fallback` until the audio is decoded, or permanently if
 * decoding fails (codec/CORS/etc.).
 */
export function Waveform({
  src,
  currentTime,
  duration,
  onSeek,
  fallback = null,
}: {
  src: string;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  fallback?: ReactNode;
}) {
  // Keyed by `src` upstream, so this initializer re-runs per track and picks up
  // any cached peaks synchronously — the effect below only handles async decode.
  const [peaks, setPeaks] = useState<number[] | null>(() => peakCache.get(src) ?? null);

  useEffect(() => {
    if (peakCache.has(src)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(src);
        const arrayBuffer = await res.arrayBuffer();
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        void ctx.close();
        const computed = computePeaks(audioBuffer);
        peakCache.set(src, computed);
        if (!cancelled) setPeaks(computed);
      } catch {
        // Leave peaks null — the parent keeps its fallback control.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!peaks) return <>{fallback}</>;

  const ratio = duration > 0 ? currentTime / duration : 0;
  const playedBars = Math.round(ratio * peaks.length);

  function seekToClientX(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    onSeek((x / rect.width) * (duration || 0));
  }

  return (
    <WaveformBars
      peaks={peaks}
      playedBars={playedBars}
      interactive
      onScrub={seekToClientX}
    />
  );
}

// Deterministic sample peaks for the decorative hero waveform — looks like an
// audio waveform without fetching or decoding anything on the landing page.
const SAMPLE_PEAKS: number[] = Array.from({ length: BARS }, (_, i) => {
  const env = Math.sin((i / BARS) * Math.PI); // fade in/out at the edges
  const detail =
    0.5 + 0.5 * Math.sin(i * 0.7) * Math.cos(i * 0.23) + 0.15 * Math.sin(i * 1.9);
  return Math.min(1, Math.max(0.08, env * Math.abs(detail)));
});

/**
 * Presentational bar waveform. Used directly by {@link Waveform} for the real
 * player, and exported on its own (via `WaveformBars` with `SAMPLE_PEAKS`) for
 * the home hero visual.
 */
export function WaveformBars({
  peaks = SAMPLE_PEAKS,
  playedBars = 0,
  interactive = false,
  onScrub,
}: {
  peaks?: number[];
  playedBars?: number;
  interactive?: boolean;
  onScrub?: (clientX: number, el: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  return (
    <div
      ref={ref}
      role={interactive ? "slider" : undefined}
      aria-label={interactive ? "Seek" : undefined}
      className={`flex h-12 w-full items-center gap-px ${
        interactive ? "cursor-pointer" : ""
      }`}
      onPointerDown={
        interactive
          ? (e) => {
              draggingRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              onScrub?.(e.clientX, e.currentTarget);
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (e) => {
              if (draggingRef.current) onScrub?.(e.clientX, e.currentTarget);
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e) => {
              draggingRef.current = false;
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
          : undefined
      }
    >
      {peaks.map((p, i) => (
        <span
          key={i}
          className={`min-h-[2px] flex-1 rounded-full ${
            i < playedBars ? "bg-primary" : "bg-muted-foreground/40"
          }`}
          style={{ height: `${Math.max(6, p * 100)}%` }}
        />
      ))}
    </div>
  );
}
