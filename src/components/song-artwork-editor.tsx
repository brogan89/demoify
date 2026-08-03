"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArtTile } from "@/components/art-tile";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_BYTES,
  isAcceptedImage,
  putToPresigned,
} from "@/lib/upload";
import { setSongArtwork } from "@/app/actions/projects";

/**
 * Cover-art editor for the song dashboard: upload/replace the artwork or remove
 * it (falling back to the band logo, then the generated sleeve). The preview
 * always shows the effective sleeve — exactly what listeners see.
 */
export function SongArtworkEditor({
  projectId,
  artworkUrl,
  fallbackArtUrl,
  uploadsEnabled,
}: {
  projectId: string;
  artworkUrl: string | null;
  /** The band's logo (or null) — what sleeves show when no artwork is set. */
  fallbackArtUrl: string | null;
  uploadsEnabled: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(artworkUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [removing, startRemove] = useTransition();

  async function onPickArtwork(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAcceptedImage(file)) {
      toast.error("Use a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is larger than 5 MB");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const contentType = file.type || "image/png";
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "artwork", projectId, contentType, fileName: file.name }),
      });
      if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error ?? "Could not start upload");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();
      await putToPresigned(uploadUrl, file, setProgress);

      const res = await setSongArtwork(projectId, publicUrl);
      if ("error" in res && res.error) throw new Error(res.error);
      setCurrent(publicUrl);
      toast.success("Artwork updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeArtwork() {
    startRemove(async () => {
      const res = await setSongArtwork(projectId, null);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setCurrent(null);
      toast.success("Artwork removed");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <ArtTile seed={projectId} size="lg" src={current ?? fallbackArtUrl} />
      <div className="min-w-0 flex-1">
        {uploadsEnabled ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept={IMAGE_ACCEPT_ATTR}
                onChange={onPickArtwork}
                disabled={uploading}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || removing}
              >
                {uploading ? "Uploading…" : current ? "Replace artwork" : "Upload artwork"}
              </Button>
              {current && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeArtwork}
                  disabled={uploading || removing}
                >
                  {removing ? "Removing…" : "Remove"}
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              PNG, JPEG or WebP · up to 5 MB · shown on the song page, feeds and player.
            </p>
            {!current && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {fallbackArtUrl
                  ? "Currently using your artist logo."
                  : "Currently using a generated sleeve."}
              </p>
            )}
            {uploading && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Uploads are disabled — set the <code className="font-mono">R2_*</code> environment
            variables to enable artwork uploads.
          </p>
        )}
      </div>
    </div>
  );
}
