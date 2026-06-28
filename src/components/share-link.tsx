"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const display = `demoify.app/${path}`;

  async function onCopy() {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/${path}`
          : `https://${display}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg border border-input bg-muted/40 px-2.5 py-1 text-sm text-muted-foreground">
        {display}
      </code>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={onCopy}
        aria-label="Copy link to clipboard"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
