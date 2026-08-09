/**
 * Shared design tokens and frame for generated Open Graph cards.
 *
 * Satori (which backs `ImageResponse`) supports only flexbox and a subset of
 * CSS — no grid, no `oklch()`. The brand stops are therefore hard-coded here as
 * sRGB hex, converted from the `--brand-from` / `--brand-to` oklch values in
 * globals.css. If those change, re-convert; they will not track automatically.
 *
 * Every element carries an explicit `display: "flex"`, because satori throws on
 * a div with multiple children that doesn't have one.
 */
import type { CSSProperties } from "react";

/** Facebook/Twitter's expected card size. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** From globals.css: --brand-from oklch(0.54 0.24 292). */
export const BRAND_FROM = "#793eea";
/** From globals.css: --brand-to oklch(0.55 0.25 345). */
export const BRAND_TO = "#ca0092";
/** Matches the dark-theme background pinned in layout.tsx's viewport themeColor. */
export const OG_BG = "#131119";
export const OG_FG = "#faf9fc";
export const OG_MUTED = "#a29fae";

const frameStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  backgroundColor: OG_BG,
  padding: "64px 72px",
  position: "relative",
};

/**
 * The card shell: dark field, brand gradient edge, wordmark footer.
 * `children` fills the middle.
 */
export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={frameStyle}>
      {/* Gradient spine down the left edge. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 14,
          height: "100%",
          display: "flex",
          backgroundImage: `linear-gradient(160deg, ${BRAND_FROM}, ${BRAND_TO})`,
        }}
      />
      {/* Soft brand bloom in the top-right, so the card isn't a flat rectangle. */}
      <div
        style={{
          position: "absolute",
          top: -220,
          right: -160,
          width: 620,
          height: 620,
          display: "flex",
          borderRadius: 9999,
          backgroundImage: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
          opacity: 0.22,
        }}
      />
      {children}
    </div>
  );
}

/** The demoify.app wordmark row that sits at the foot of every card. */
export function OgWordmark({ label = "demoify.app" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 34,
          height: 34,
          display: "flex",
          borderRadius: 10,
          backgroundImage: `linear-gradient(135deg, ${BRAND_FROM}, ${BRAND_TO})`,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 26,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: OG_MUTED,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/**
 * Cut a string to `max` characters on a word boundary where possible.
 * Satori has no `text-overflow: ellipsis`, so overflow has to be handled here
 * or a long song title silently blows out the card.
 */
export function truncate(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
