import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

// No "use client": pure render, usable from server and client trees alike.

/** djb2 (xor variant) → uint32. Integer-only so SSR and client agree exactly. */
function hashSeed(seed: string): number {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (((h << 5) + h) ^ seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic "sleeve art" gradient for a seed (song id, band username…).
 * Songs have no cover art in the data model, so every track gets a generated
 * sleeve instead — same seed, same sleeve, everywhere it appears.
 *
 * Hues ride the brand arc (indigo 250° → violet → magenta → pink, wrapping
 * past 360°); lightness/chroma are fixed so every tile stays in-family on both
 * themes. All derived values are integers — the emitted style string must be
 * byte-identical between server render and hydration.
 */
export function sleeveGradient(seed: string): CSSProperties {
  const h = hashSeed(seed);
  const hue1 = 250 + (h % 125);
  const hue2 = hue1 + 34 + ((h >>> 7) % 26);
  const angle = 115 + ((h >>> 13) % 130); // light always falls from the top-left
  return {
    backgroundImage:
      `radial-gradient(120% 90% at 18% 12%, oklch(0.95 0.03 ${hue1} / 0.22), transparent 55%), ` +
      `linear-gradient(${angle}deg, oklch(0.62 0.19 ${hue1}), oklch(0.33 0.13 ${hue2}))`,
  };
}

const SIZES = {
  /** Player bar */
  sm: "size-10 rounded-md",
  /** Feed cards */
  md: "size-14 rounded-lg",
  /** Song detail header */
  lg: "size-20 rounded-xl md:size-24",
} as const;

/**
 * The generated sleeve as a tile, with an optional overlay slot (equalizer,
 * play glyph). Decorative — hidden from assistive tech.
 */
export function ArtTile({
  seed,
  size = "md",
  className,
  children,
}: {
  seed: string;
  size?: keyof typeof SIZES;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden
      style={sleeveGradient(seed)}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-white/10 ring-inset",
        SIZES[size],
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Three dancing bars — the "now playing" glyph. Bars use the current text
 * color; set `text-white` (over sleeves) or `text-primary` as needed. Freezes
 * in place when paused, and stays static under prefers-reduced-motion (see
 * globals.css).
 */
export function Equalizer({
  playing = true,
  className,
}: {
  playing?: boolean;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn("flex h-4 items-end gap-0.5", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "h-full w-1 origin-bottom rounded-full bg-current animate-equalizer",
            !playing && "paused",
          )}
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </span>
  );
}
