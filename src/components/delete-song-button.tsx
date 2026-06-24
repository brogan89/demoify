"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/app/actions/projects";

export function DeleteSongButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    try {
      const result = await deleteProject(projectId);
      if (result.error) throw new Error(result.error);
      toast.success("Song deleted");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete song");
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="gap-1.5"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-3.5" />
        Delete
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Delete this song?</span>
      <Button variant="destructive" size="sm" disabled={busy} onClick={onDelete}>
        {busy ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </div>
  );
}
