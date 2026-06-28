"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { recordPlay, recordFullPlay } from "@/app/actions/plays";

/**
 * A playable track. Carries everything the persistent bottom bar needs to render
 * (title + artist link) plus the public R2 `audioUrl` — which never expires, so a
 * queued track stays valid as the user navigates between pages.
 */
export type Track = {
  projectId: string;
  versionId: string;
  audioUrl: string;
  duration: number | null;
  title: string;
  slug: string;
  band: { username: string; displayName: string };
};

type PlayerContextValue = {
  current: Track | null;
  playing: boolean;
  duration: number;
  /** Play a list of tracks starting at `startIndex` — the rest become the queue. */
  playQueue: (tracks: Track[], startIndex: number, opts?: { startAt?: number }) => void;
  /** Play a single track (clears any existing queue). */
  playTrack: (track: Track, opts?: { startAt?: number }) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  /** Current playhead, read on demand (doesn't re-render on each tick). */
  getCurrentTime: () => number;
  next: () => void;
  dismiss: () => void;
  isActive: (projectId: string, versionId?: string) => boolean;
  /** Lifetime play count for `projectId`, including this session's optimistic bumps. */
  playCountFor: (projectId: string, base: number) => number;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
// The moving playhead lives in its own context so only the active track's waveform
// and the bottom bar re-render on each `timeupdate` — not every card in the feed.
const PlayerTimeContext = createContext<number>(0);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

export function usePlayerTime(): number {
  return useContext(PlayerTimeContext);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Optimistic play counts, keyed by projectId, so counts bump immediately app-wide.
  const [playBumps, setPlayBumps] = useState<Record<string, number>>({});

  const current = queue[index] ?? null;

  // Seek the next-loaded source here once its metadata arrives — used to jump to a
  // timestamped comment, including after switching to that comment's version.
  const startAtRef = useRef<number | null>(null);
  // Count at most one play per project per session, so resume/seek don't inflate it.
  const countedRef = useRef<Set<string>>(new Set());
  // Mirror of the queue, written only in callbacks, so the stable `next()` can read
  // the latest queue length without a render-time ref write.
  const queueRef = useRef(queue);

  // Start (or restart) playback whenever the active source changes. Setting `src`
  // declaratively triggers a reload; the browser queues this play() until ready.
  // Guarded so metadata-driven re-renders don't restart the current track.
  const lastPlayedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (lastPlayedUrlRef.current === current.audioUrl) return;
    lastPlayedUrlRef.current = current.audioUrl;
    void a.play().catch(() => {});
  }, [current]);

  // Reserve bottom space (and let the fixed bar sit above content) only while a
  // track is loaded — see the `body[data-player-active]` rule in globals.css.
  useEffect(() => {
    document.body.dataset.playerActive = current ? "true" : "false";
    return () => {
      delete document.body.dataset.playerActive;
    };
  }, [current]);

  const playQueue = useCallback(
    (tracks: Track[], startIndex: number, opts?: { startAt?: number }) => {
      startAtRef.current = opts?.startAt ?? null;
      queueRef.current = tracks;
      setQueue(tracks);
      setIndex(startIndex);
    },
    [],
  );

  const playTrack = useCallback(
    (track: Track, opts?: { startAt?: number }) => playQueue([track], 0, opts),
    [playQueue],
  );

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = seconds;
    setCurrentTime(seconds);
  }, []);

  const getCurrentTime = useCallback(() => audioRef.current?.currentTime ?? 0, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < queueRef.current.length ? i + 1 : i));
  }, []);

  const dismiss = useCallback(() => {
    audioRef.current?.pause();
    queueRef.current = [];
    setQueue([]);
    setIndex(0);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const isActive = useCallback(
    (projectId: string, versionId?: string) =>
      current?.projectId === projectId &&
      (versionId === undefined || current?.versionId === versionId),
    [current],
  );

  const playCountFor = useCallback(
    (projectId: string, base: number) => base + (playBumps[projectId] ?? 0),
    [playBumps],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      current,
      playing,
      duration,
      playQueue,
      playTrack,
      toggle,
      seek,
      getCurrentTime,
      next,
      dismiss,
      isActive,
      playCountFor,
    }),
    // `playCountFor` changes when `playBumps` does, so consumers recompute counts;
    // `current`, `playing` and `duration` cover the rest. Other callbacks are stable.
    [current, playing, duration, playQueue, playTrack, toggle, seek, getCurrentTime, next, dismiss, isActive, playCountFor],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerTimeContext.Provider value={currentTime}>
        {children}
        <audio
          ref={audioRef}
          src={current?.audioUrl}
          preload="metadata"
          onLoadStart={() => {
            // New source selected — reset the transport.
            setPlaying(false);
            setCurrentTime(0);
            setDuration(current?.duration ?? 0);
          }}
          onPlay={() => {
            setPlaying(true);
            const pid = current?.projectId;
            if (pid && !countedRef.current.has(pid)) {
              countedRef.current.add(pid);
              setPlayBumps((b) => ({ ...b, [pid]: (b[pid] ?? 0) + 1 }));
              void recordPlay(pid);
            }
          }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            if (startAtRef.current != null) {
              e.currentTarget.currentTime = startAtRef.current;
              setCurrentTime(startAtRef.current);
              startAtRef.current = null;
            }
          }}
          onEnded={() => {
            setPlaying(false);
            const pid = current?.projectId;
            if (pid) {
              void recordFullPlay(pid).then((res) => {
                if (res.earned > 0) toast.success(`+${res.earned} credits for listening`);
              });
            }
            // Auto-advance to the next queued track.
            next();
          }}
        />
      </PlayerTimeContext.Provider>
    </PlayerContext.Provider>
  );
}
