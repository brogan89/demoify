"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GENRE_NAMES, getSubgenres } from "@/lib/genres";
import { UPLOAD_COST } from "@/lib/credits";
import {
  ACCEPT_ATTR,
  MAX_BYTES,
  isAcceptedAudio,
  readDuration,
  putToPresigned,
} from "@/lib/upload";
import { createProject } from "@/app/actions/projects";
import { createVersion } from "@/app/actions/versions";

export function CreateSongForm({
  uploadsEnabled,
  credits,
  creditsRequired = true,
}: {
  uploadsEnabled: boolean;
  credits: number;
  // When false (self-hosting with CREDITS_ENABLED=false), uploads are free —
  // no cost label and no affordability gate.
  creditsRequired?: boolean;
}) {
  const router = useRouter();
  const canAfford = !creditsRequired || credits >= UPLOAD_COST;
  const [title, setTitle] = useState("");
  // Subgenre options depend on the chosen genre; reset subgenre when genre changes.
  const [genre, setGenre] = useState("");
  const subgenres = getSubgenres(genre);

  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    // Validate the (optional) audio file up front, before creating anything.
    if (file) {
      if (!isAcceptedAudio(file)) {
        toast.error("Only MP3 or WAV files are supported");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File is larger than 100 MB");
        return;
      }
    }

    setBusy(true);
    setProgress(0);
    try {
      // 1. Create the project to get its id (title/description/genre/subgenre).
      const res = await createProject(new FormData(form));
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      const { projectId } = res;

      // 2. If an audio file was chosen, run the existing upload flow against it.
      if (file && uploadsEnabled && canAfford) {
        try {
          const contentType =
            file.type || (/\.wav$/i.test(file.name) ? "audio/wav" : "audio/mpeg");
          const duration = await readDuration(file);

          const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, contentType, fileName: file.name }),
          });
          if (!presignRes.ok) {
            const { error } = await presignRes
              .json()
              .catch(() => ({ error: "Upload failed" }));
            throw new Error(error ?? "Could not start upload");
          }
          const { uploadUrl, publicUrl } = await presignRes.json();

          await putToPresigned(uploadUrl, file, setProgress);

          const versionRes = await createVersion({
            projectId,
            audioUrl: publicUrl,
            duration,
          });
          if ("error" in versionRes && versionRes.error) throw new Error(versionRes.error);

          toast.success("Song created");
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `Song created, but the audio upload failed: ${err.message}`
              : "Song created, but the audio upload failed — add it from the song page.",
          );
        }
      } else {
        toast.success("Song created");
      }

      // 3. Off to the new song's page either way.
      router.push(`/dashboard/${projectId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Song Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} placeholder="A short note…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="genre">Genre (optional)</Label>
          <Select
            id="genre"
            name="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">No genre</option>
            {GENRE_NAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subgenre">Subgenre (optional)</Label>
          <Select id="subgenre" name="subgenre" disabled={subgenres.length === 0}>
            <option value="">No subgenre</option>
            {subgenres.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {uploadsEnabled && (
        <div className="space-y-1.5">
          <Label htmlFor="audio">Audio file (optional)</Label>
          <input
            id="audio"
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm"
          />
          {creditsRequired &&
            (canAfford ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="size-3.5" />
                Adding audio costs {UPLOAD_COST} credits · you have {credits}
              </p>
            ) : (
              file && (
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Coins className="size-3.5" />
                  Audio costs {UPLOAD_COST} credits — you have {credits}.{" "}
                  <Link href="/dashboard/credits" className="text-primary hover:underline">
                    Buy more credits
                  </Link>
                  , or create the song without audio for now.
                </p>
              )
            ))}
        </div>
      )}

      {busy && progress > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      <Button
        type="submit"
        // Block submitting *with* a file the band can't afford; a text-only song
        // is always allowed.
        disabled={busy || (Boolean(file) && uploadsEnabled && !canAfford)}
        className="w-full"
      >
        {busy
          ? progress > 0
            ? "Uploading…"
            : "Creating…"
          : file && uploadsEnabled && creditsRequired
            ? `Create song · ${UPLOAD_COST} credits`
            : "Create song"}
      </Button>
    </form>
  );
}
