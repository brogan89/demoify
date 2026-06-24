"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { Comments, type CommentDTO } from "@/components/comments";
import { recordPlay } from "@/app/actions/plays";
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
  playCount,
  comments,
  currentUserId,
  isOwner,
}: {
  versions: VersionDTO[];
  projectId: string;
  playCount: number;
  comments: CommentDTO[];
  currentUserId: string | null;
  isOwner: boolean;
}) {
  // versions arrive newest-first; default the player to the latest.
  const [selectedId, setSelectedId] = useState(versions[0]?.id);
  const selected = versions.find((v) => v.id === selectedId) ?? versions[0];

  // Lifetime play count for the URL, updated optimistically as you play.
  const [plays, setPlays] = useState(playCount);
  // Count at most one play per version per session, so resume/seek don't inflate.
  const countedRef = useRef<Set<string>>(new Set());

  function handlePlay(versionId: string) {
    if (countedRef.current.has(versionId)) return;
    countedRef.current.add(versionId);
    setPlays((n) => n + 1);
    void recordPlay(projectId);
  }

  if (!selected) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No versions uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Now playing — v{selected.versionNumber}
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
        <AudioPlayer
          src={selected.audioUrl}
          initialDuration={selected.duration}
          onPlay={() => handlePlay(selected.id)}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium">Version history</h3>
        <ol className="relative space-y-0 border-l pl-5">
          {versions.map((v) => {
            const active = v.id === selected.id;
            const dur = fmtDuration(v.duration);
            return (
              <li key={v.id} className="relative pb-5 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full ring-4 ring-background",
                    active ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setSelectedId(v.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    active ? "border-primary bg-accent" : "hover:bg-accent/50",
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
        isOwner={isOwner}
      />
    </div>
  );
}
