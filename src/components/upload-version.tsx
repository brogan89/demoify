"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Coins, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UPLOAD_COST } from "@/lib/credits";
import {
  ACCEPT_ATTR,
  MAX_BYTES,
  isAcceptedAudio,
  readDuration,
  putToPresigned,
} from "@/lib/upload";
import { createVersion } from "@/app/actions/versions";

export function UploadVersion({
  projectId,
  uploadsEnabled,
  credits,
}: {
  projectId: string;
  uploadsEnabled: boolean;
  credits: number;
}) {
  const canAfford = credits >= UPLOAD_COST;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an MP3 or WAV file first");
      return;
    }
    if (!isAcceptedAudio(file)) {
      toast.error("Only MP3 or WAV files are supported");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("File is larger than 100 MB");
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const contentType = file.type || (/\.wav$/i.test(file.name) ? "audio/wav" : "audio/mpeg");
      const duration = await readDuration(file);

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, contentType, fileName: file.name }),
      });
      if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error ?? "Could not start upload");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();

      await putToPresigned(uploadUrl, file, setProgress);

      const result = await createVersion({
        projectId,
        audioUrl: publicUrl,
        changelog,
        duration,
      });
      if ("error" in result && result.error) throw new Error(result.error);

      toast.success("New version uploaded");
      setFile(null);
      setChangelog("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  if (!uploadsEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Uploads are disabled — set the <code className="font-mono">R2_*</code> environment
        variables to enable audio uploads.
      </div>
    );
  }

  if (!canAfford) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Coins className="size-4" />
          You have {credits} credits. Each upload costs {UPLOAD_COST}.
        </p>
        <Button asChild size="sm">
          <Link href="/dashboard/credits">Buy more credits</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Coins className="size-3.5" />
        Costs {UPLOAD_COST} credits · you have {credits}
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="audio">Audio file (MP3 or WAV)</Label>
        <input
          id="audio"
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="changelog">Changelog (optional)</Label>
        <Textarea
          id="changelog"
          placeholder="What changed in this version?"
          value={changelog}
          onChange={(e) => setChangelog(e.target.value)}
          disabled={busy}
          rows={2}
        />
      </div>
      {busy && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      <Button type="submit" disabled={busy} className="gap-2">
        <Upload className="size-4" />
        {busy ? "Uploading…" : "Upload version"}
      </Button>
    </form>
  );
}
