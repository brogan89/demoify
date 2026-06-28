"use client";

import { useState, useSyncExternalStore } from "react";
import { Monitor, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Common portrait device widths to preview at.
const PRESETS = [
  { label: "iPhone", width: 390 },
  { label: "Android", width: 360 },
  { label: "Tablet", width: 768 },
];

// SSR-safe, client-only check for "am I inside an iframe?" — server snapshot is
// always false, the client recomputes after hydration without a mismatch.
const noSubscribe = () => () => {};
function useIsFramed(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => window.self !== window.top,
    () => false,
  );
}

/**
 * Dev-only floating toggle that previews the current page at a phone width, so you
 * can eyeball the mobile layout without devtools. The page is loaded inside an
 * `<iframe>` (not just a narrow `<div>`) because Tailwind's `sm:`/`md:` breakpoints
 * respond to the *viewport*, not a container — only the iframe's own viewport makes
 * the real mobile layout (e.g. the header's hamburger menu) kick in.
 *
 * The layout renders this only outside production (`NODE_ENV`).
 */
export function DevViewportToggle() {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");
  const [width, setWidth] = useState(PRESETS[0].width);

  // The preview iframe loads the same app, which renders this component again —
  // hide it in there so it can't recurse or clutter the preview.
  const framed = useIsFramed();
  if (framed) return null;

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          setHref(window.location.href);
          setOpen(true);
        }}
        title="Preview this page at mobile width"
        className="fixed left-4 top-32 z-[60] gap-2 border shadow-md"
      >
        <Smartphone className="size-4" />
        Mobile view
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-black/60 p-3 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2 rounded-lg border bg-background p-1.5 shadow-md">
        {PRESETS.map((p) => (
          <Button
            key={p.width}
            type="button"
            size="sm"
            variant={width === p.width ? "default" : "ghost"}
            onClick={() => setWidth(p.width)}
            className="gap-1.5"
          >
            <Smartphone className="size-3.5" />
            {p.label}
            <span className="text-xs opacity-70">{p.width}</span>
          </Button>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} className="gap-1.5">
          <Monitor className="size-3.5" />
          Desktop
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setOpen(false)}
          aria-label="Close preview"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden rounded-[2rem] border-4 border-foreground/20 bg-background shadow-2xl",
        )}
        style={{ width }}
      >
        <iframe src={href} title="Mobile preview" className="h-full w-full" />
      </div>
    </div>
  );
}
