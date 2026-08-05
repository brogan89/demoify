"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/${path}`
          : `https://demoify.app/${path}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={onCopy}
      aria-label="Share link (copies to clipboard)"
    >
      {copied ? <Check className="size-3.5" /> : <Share2 className="size-3.5" />}
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
