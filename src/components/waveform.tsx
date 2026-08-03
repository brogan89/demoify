"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { WAVEFORM_BARS, decodeToPeaks, downsamplePeaks } from "@/lib/waveform";
import { saveWaveform } from "@/app/actions/versions";

// Decoded peak arrays are cached per source URL so re-renders (and re-mounts when
// switching tracks back and forth) don't re-fetch and re-decode the whole file.
const peakCache = new Map<string, number[]>();

// Versions we've already tried to backfill this session — one attempt is enough
// whether or not the server accepted it (it rejects non-members and non-null rows).
const backfilled = new Set<string>();

/**
 * Renders the real waveform of a track with a played/unplayed split and
 * click-to-seek.
 *
 * When `peaks` (precomputed at upload, stored on SongVersion) is present it
 * renders immediately with no audio fetch or decode — the only path that works
 * on mobile browsers. Otherwise (legacy versions) it falls back to fetching and
 * decoding `src` in the browser, shows `fallback` until that resolves — or
 * permanently if decoding fails (codec/memory/CORS) — and reports the decoded
 * peaks back to the server so the version renders instantly everywhere next time.
 */
export function Waveform({
  src,
  peaks: storedPeaks,
  versionId,
  currentTime,
  duration,
  onSeek,
  fallback = null,
}: {
  src: string;
  peaks?: number[] | null;
  versionId?: string;
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
  fallback?: ReactNode;
}) {
  // Keyed by `src` upstream, so this initializer re-runs per track and picks up
  // stored or cached peaks synchronously — the effect below only handles async
  // decode for legacy versions without stored peaks.
  const [peaks, setPeaks] = useState<number[] | null>(
    () => storedPeaks ?? peakCache.get(src) ?? null,
  );

  useEffect(() => {
    if (storedPeaks || peakCache.has(src)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(src);
        const arrayBuffer = await res.arrayBuffer();
        const { peaks: computed } = await decodeToPeaks(arrayBuffer);
        peakCache.set(src, computed);
        if (!cancelled) setPeaks(computed);
        // Backfill: persist client-decoded peaks for pre-#6 versions so future
        // viewers (mobile included) get them served. The server only accepts
        // writes from the song's band members and only while the column is null.
        if (versionId && !backfilled.has(versionId)) {
          backfilled.add(versionId);
          void saveWaveform({ versionId, peaks: computed }).catch(() => {});
        }
      } catch {
        // Leave peaks null — the parent keeps its fallback control.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, storedPeaks, versionId]);

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
const SAMPLE_PEAKS: number[] = Array.from({ length: WAVEFORM_BARS }, (_, i) => {
  const env = Math.sin((i / WAVEFORM_BARS) * Math.PI); // fade in/out at the edges
  const detail =
    0.5 + 0.5 * Math.sin(i * 0.7) * Math.cos(i * 0.23) + 0.15 * Math.sin(i * 1.9);
  return Math.min(1, Math.max(0.08, env * Math.abs(detail)));
});

// Narrowest a bar may get before we drop bars instead (plus the 1px `gap-px`).
const MIN_BAR_PX = 2;
const GAP_PX = 1;

/**
 * Presentational bar waveform. Used directly by {@link Waveform} for the real
 * player, and exported on its own (via `WaveformBars` with `SAMPLE_PEAKS`) for
 * the home hero visual.
 *
 * Bars are downsampled to what the measured container width can physically fit
 * — on phones, 160 bars' worth of 1px gaps alone exceed the container, which
 * rounded every bar to zero width and made waveforms invisible (issue #6).
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

  // 0 until measured (SSR and first client render agree → no hydration mismatch).
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxBars =
    width > 0
      ? Math.max(16, Math.floor((width + GAP_PX) / (MIN_BAR_PX + GAP_PX)))
      : peaks.length;
  const bars = downsamplePeaks(peaks, maxBars);
  // `playedBars` is indexed against the full `peaks` array — rescale it.
  const played =
    peaks.length > 0 ? Math.round((playedBars / peaks.length) * bars.length) : 0;

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
      {bars.map((p, i) => {
        const isPlayed = i < played;
        // Position along the bar run, as an integer percent so the emitted
        // style string is identical on server and client (hydration-safe).
        const pct = Math.round((i / bars.length) * 100);
        return (
          <span
            key={i}
            className={`min-h-[2px] flex-1 rounded-full ${
              isPlayed ? "" : "bg-muted-foreground/30"
            }`}
            // Height rounds to 2 decimals so tiny Math.sin/cos differences
            // between the server and browser don't produce mismatched height
            // strings (which would trip React hydration on the home hero).
            // Played bars sweep the brand gradient left → right.
            style={{
              height: `${Math.max(6, p * 100).toFixed(2)}%`,
              ...(isPlayed
                ? {
                    background: `color-mix(in oklch, var(--brand-from), var(--brand-to) ${pct}%)`,
                  }
                : {}),
            }}
          />
        );
      })}
    </div>
  );
}
