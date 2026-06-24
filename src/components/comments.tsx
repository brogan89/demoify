"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Play, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/app/actions/comments";

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  versionId: string;
  versionNumber: number;
  timestampSeconds: number | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Whole-seconds → "m:ss".
function fmtTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// "1:23" or "83" → seconds, or null if it can't be parsed into a valid time.
function parseTimestamp(input: string): number | null {
  const v = input.trim();
  if (!v) return null;
  if (v.includes(":")) {
    const [m, s] = v.split(":");
    const mins = Number(m);
    const secs = Number(s);
    if (!Number.isInteger(mins) || mins < 0) return null;
    if (!Number.isInteger(secs) || secs < 0 || secs > 59) return null;
    return mins * 60 + secs;
  }
  const secs = Number(v);
  if (!Number.isInteger(secs) || secs < 0) return null;
  return secs;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function Comments({
  projectId,
  selectedVersionId,
  selectedVersionNumber,
  comments,
  currentUserId,
  canComment,
  canModerate,
  getCurrentTime,
  onJumpTo,
}: {
  projectId: string;
  selectedVersionId: string;
  selectedVersionNumber: number;
  comments: CommentDTO[];
  currentUserId: string | null;
  canComment: boolean;
  canModerate: boolean;
  getCurrentTime?: () => number;
  onJumpTo?: (versionId: string, seconds: number) => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [withTimestamp, setWithTimestamp] = useState(false);
  const [tsField, setTsField] = useState("");
  const [pending, startTransition] = useTransition();

  // Ticking the box captures the player's current position; the user can still
  // edit the field to type any time.
  function toggleTimestamp(checked: boolean) {
    setWithTimestamp(checked);
    if (checked) setTsField(fmtTime(getCurrentTime?.() ?? 0));
  }

  function submit() {
    const text = body.trim();
    if (!text) return;

    let timestampSeconds: number | null = null;
    if (withTimestamp) {
      timestampSeconds = parseTimestamp(tsField);
      if (timestampSeconds == null) {
        toast.error("Enter a valid timestamp like 1:23");
        return;
      }
    }

    startTransition(async () => {
      const res = await addComment({
        projectId,
        versionId: selectedVersionId,
        body: text,
        timestampSeconds,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setBody("");
      setWithTimestamp(false);
      setTsField("");
      if (res.earned && res.earned > 0) {
        toast.success(`+${res.earned} credits for commenting`);
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteComment(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">
        Comments{comments.length > 0 && ` (${comments.length})`}
      </h3>

      {currentUserId && canComment ? (
        <div className="mb-6 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Comment on v${selectedVersionNumber}…`}
            disabled={pending}
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={withTimestamp}
                onChange={(e) => toggleTimestamp(e.target.checked)}
                disabled={pending}
                className="size-4 cursor-pointer accent-primary"
              />
              Add current timestamp
              {withTimestamp && (
                <Input
                  value={tsField}
                  onChange={(e) => setTsField(e.target.value)}
                  disabled={pending}
                  placeholder="0:00"
                  inputMode="numeric"
                  aria-label="Timestamp"
                  className="h-7 w-16 text-center font-mono"
                />
              )}
            </label>
            <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
              Comment on v{selectedVersionNumber}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-6 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Log in
          </Link>{" "}
          to leave a comment.
        </p>
      )}

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const canDelete = currentUserId === c.authorId || canModerate;
            return (
              <li key={c.id} className="flex gap-3">
                <Avatar size="sm">
                  {c.authorAvatarUrl && <AvatarImage src={c.authorAvatarUrl} alt="" />}
                  <AvatarFallback>{initials(c.authorName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      v{c.versionNumber}
                    </span>
                    {c.timestampSeconds != null && (
                      <button
                        type="button"
                        onClick={() => onJumpTo?.(c.versionId, c.timestampSeconds!)}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                        title="Jump to this moment"
                      >
                        <Play className="size-2.5 fill-current" />
                        {fmtTime(c.timestampSeconds)}
                      </button>
                    )}
                    <span className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        disabled={pending}
                        aria-label="Delete comment"
                        className="ml-auto text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
