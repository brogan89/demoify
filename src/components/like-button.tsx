"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleLike } from "@/app/actions/likes";

export function LikeButton({
  projectId,
  initialLiked,
  initialCount,
  isAuthed,
}: {
  projectId: string;
  initialLiked: boolean;
  initialCount: number;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    // Optimistic flip; reconcile with the server's authoritative count.
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevCount + (prevLiked ? -1 : 1));

    startTransition(async () => {
      const res = await toggleLike(projectId);
      if ("error" in res) {
        setLiked(prevLiked);
        setCount(prevCount);
        toast.error(res.error);
        return;
      }
      setLiked(res.liked);
      setCount(res.count);
      if (res.earned > 0) {
        toast.success(`+${res.earned} credit${res.earned === 1 ? "" : "s"} for the like`);
        router.refresh(); // reflect the new balance in the header
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike" : "Like"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50",
        liked
          ? "border-primary/40 text-primary"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Heart className={cn("size-3.5", liked && "fill-current")} />
      {count}
    </button>
  );
}
