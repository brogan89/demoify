"use client";

import { useEffect, useState } from "react";
import { Globe, X } from "lucide-react";

const STORAGE_KEY = "federation-banner-dismissed";

/**
 * A dismissible banner announcing that federation is now open on demoify.app.
 * Self-hosted instances can register and share their public tracks in Explore.
 * Dismissed state is persisted in localStorage so returning visitors don't see
 * it again. Only rendered on hub instances (checked by the parent server
 * component).
 */
export function FederationBannerClient() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(STORAGE_KEY));
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="bg-primary/5 border-b border-primary/10 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm">
          <Globe className="size-4 shrink-0 text-primary" />
          <span>
            <strong>Federation is now open.</strong> Self-host your own Demoify
            instance and share your public tracks in the Explore feed.{" "}
            <a
              href="https://github.com/brogan89/demoify/blob/main/docs/federation.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Learn more
            </a>
            {" · "}
            <a
              href="https://github.com/brogan89/demoify"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Deploy your own
            </a>
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
