"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_BYTES,
  isAcceptedImage,
  putToPresigned,
} from "@/lib/upload";
import { updateAccountProfile } from "@/app/actions/account";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function AccountProfileForm({
  initialDisplayName,
  initialAvatarUrl,
}: {
  initialDisplayName: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, startSave] = useTransition();

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
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
    try {
      const contentType = file.type || "image/png";
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "avatar", contentType, fileName: file.name }),
      });
      if (!presignRes.ok) {
        const { error } = await presignRes.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error ?? "Could not start upload");
      }
      const { uploadUrl, publicUrl } = await presignRes.json();
      await putToPresigned(uploadUrl, file);

      const res = await updateAccountProfile({ avatarUrl: publicUrl });
      if (res.error) throw new Error(res.error);
      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function save() {
    startSave(async () => {
      const res = await updateAccountProfile({ displayName });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Profile saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(displayName || "?")}</AvatarFallback>
        </Avatar>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT_ATTR}
            onChange={onPickAvatar}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Change avatar"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPEG or WebP · up to 5 MB</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountDisplayName">Display name</Label>
        <Input
          id="accountDisplayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">Shown on your comments.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !displayName.trim()}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
