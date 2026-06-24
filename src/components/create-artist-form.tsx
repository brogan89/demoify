"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createArtistProfile } from "@/app/actions/bands";

export function CreateArtistForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const res = await createArtistProfile({ name: value });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Artist profile created");
      router.push(`/${res.username}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="artistName">Artist name</Label>
        <Input
          id="artistName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Artist name"
          maxLength={60}
          disabled={pending}
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          A public profile is created at demoify.app/
          <span className="font-mono">artist-name</span>. It starts with 1 free upload.
        </p>
      </div>
      <Button onClick={submit} disabled={pending || !name.trim()} className="w-full">
        {pending ? "Creating…" : "Create artist profile"}
      </Button>
    </div>
  );
}
