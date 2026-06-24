"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/app/actions/comments";

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  versionNumber: number;
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
}: {
  projectId: string;
  selectedVersionId: string;
  selectedVersionNumber: number;
  comments: CommentDTO[];
  currentUserId: string | null;
  canComment: boolean;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const res = await addComment({
        projectId,
        versionId: selectedVersionId,
        body: text,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setBody("");
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
          <div className="flex justify-end">
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
