"use client";

import { PlayerControls } from "@/components/player/player-controls";
import { usePlayer, usePlayerTime, type Track } from "@/components/player/player-provider";

/**
 * A track's inline transport, wired to the global player. When this track is the
 * one playing, the control mirrors live playback (and seeking/pausing it controls
 * the persistent bar too); otherwise it sits idle and `onStart` kicks playback off.
 * Only the active variant subscribes to the playhead, so an idle feed of cards
 * doesn't re-render on every `timeupdate`.
 */
export function TrackPlayer({
  track,
  onStart,
}: {
  track: Track;
  // Begin playing this track (the caller sets up the queue); `startAt` seeks once
  // it loads — used when scrubbing the waveform of a track that isn't playing yet.
  onStart: (startAt?: number) => void;
}) {
  const { isActive } = usePlayer();
  return isActive(track.projectId, track.versionId) ? (
    <ActiveTrackPlayer track={track} />
  ) : (
    <PlayerControls
      src={track.audioUrl}
      playing={false}
      currentTime={0}
      duration={track.duration ?? 0}
      onToggle={() => onStart()}
      onSeek={(s) => onStart(s)}
      className="rounded-lg border bg-card p-3"
    />
  );
}

function ActiveTrackPlayer({ track }: { track: Track }) {
  const { playing, duration, toggle, seek } = usePlayer();
  const currentTime = usePlayerTime();
  return (
    <PlayerControls
      src={track.audioUrl}
      playing={playing}
      currentTime={currentTime}
      duration={duration || (track.duration ?? 0)}
      onToggle={toggle}
      onSeek={seek}
      className="rounded-lg border border-primary/50 bg-card p-3"
    />
  );
}
