"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Comments, type CommentDTO } from "@/components/comments";
import { TrackPlayer } from "@/components/player/track-player";
import { usePlayer, type Track } from "@/components/player/player-provider";
import { cn } from "@/lib/utils";

export type VersionDTO = {
  id: string;
  versionNumber: number;
  audioUrl: string;
  changelog: string | null;
  duration: number | null;
  uploadedAt: string;
};

function fmtDuration(d: number | null): string | null {
  if (!d || !Number.isFinite(d)) return null;
  const m = Math.floor(d / 60);
  const s = Math.floor(d % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SongView({
  versions,
  projectId,
  title,
  slug,
  band,
  playCount,
  comments,
  currentUserId,
  canComment,
  canModerate,
}: {
  versions: VersionDTO[];
  projectId: string;
  title: string;
  slug: string;
  band: { username: string; displayName: string };
  playCount: number;
  comments: CommentDTO[];
  currentUserId: string | null;
  canComment: boolean;
  canModerate: boolean;
}) {
  // versions arrive newest-first; default the inline player to the latest.
  const [selectedId, setSelectedId] = useState(versions[0]?.id);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[0];

  const { playTrack, isActive, getCurrentTime, playCountFor } = usePlayer();

  function trackFor(v: VersionDTO): Track {
    return {
      projectId,
      versionId: v.id,
      audioUrl: v.audioUrl,
      duration: v.duration,
      title,
      slug,
      band,
    };
  }

  // Jump to a timestamped comment: select that version and play from `seconds`.
  function jumpTo(versionId: string, seconds: number) {
    const v = versions.find((x) => x.id === versionId);
    if (!v) return;
    setSelectedId(versionId);
    playTrack(trackFor(v), { startAt: seconds });
  }

  if (!selected) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No versions uploaded yet.
      </p>
    );
  }

  const active = isActive(projectId, selected.id);
  const plays = playCountFor(projectId, playCount);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            v{selected.versionNumber}
            {selected.versionNumber === versions[0].versionNumber && " (latest)"}
          </h2>
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title="Total plays"
          >
            <Play className="size-3 fill-current" />
            {plays.toLocaleString()} {plays === 1 ? "play" : "plays"}
          </span>
        </div>
        <TrackPlayer
          track={trackFor(selected)}
          onStart={(startAt) =>
            playTrack(trackFor(selected), startAt != null ? { startAt } : undefined)
          }
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Version history</h3>
        <ol className="relative space-y-0 border-l pl-5">
          {versions.map((v) => {
            const isSelected = v.id === selected.id;
            const dur = fmtDuration(v.duration);
            return (
              <li key={v.id} className="relative pb-5 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full ring-4 ring-background",
                    isSelected ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    isSelected ? "border-primary bg-accent" : "hover:bg-accent/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">v{v.versionNumber}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(v.uploadedAt)}
                      {dur && ` · ${dur}`}
                    </span>
                  </div>
                  {v.changelog && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.changelog}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <Comments
        projectId={projectId}
        selectedVersionId={selected.id}
        selectedVersionNumber={selected.versionNumber}
        comments={comments}
        currentUserId={currentUserId}
        canComment={canComment}
        canModerate={canModerate}
        getCurrentTime={() => (active ? getCurrentTime() : 0)}
        onJumpTo={jumpTo}
      />
    </div>
  );
}
