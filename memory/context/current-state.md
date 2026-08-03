# Current state — demoify

_Last updated: 2026-08-03_

## Where things left off

- **"Studio Glow" visual redesign implemented — uncommitted in the working
  tree.** Full premium restyle for musicians/producers: violet→magenta brand
  gradient (`--brand-from`/`--brand-to` + `bg-brand-gradient` /
  `text-brand-gradient` utilities in globals.css), dark theme by default
  (light fully supported), Bricolage Grotesque as the display face via
  `font-heading`, and a rebuilt animated home page (hero with self-playing
  waveform, genre marquee, live "Fresh demos" section pulling real public
  tracks, numbered how-it-works, gradient-border tipping card, final CTA).
  New components: `reveal.tsx` (IntersectionObserver scroll reveals),
  `art-tile.tsx` (deterministic per-song gradient "sleeve art" — djb2 hash of
  song id → hues; also `Equalizer` glyph + `sleeveGradient()` reused for
  avatar fallbacks), `nav-link.tsx` (active nav state). Feed cards, player
  bar, explore/song/profile/artists pages restyled; no schema, data-flow, or
  dependency changes. Fixed a long-standing bug where
  `--font-sans: var(--font-sans)` was self-referential so Geist never
  actually applied.
- Issue #6 (server-stored waveforms) is committed (`41b5d56`).

## Known gotchas

- `WaveformBars` must render identical markup on server and first client
  render (width state starts at 0). The redesign extends this rule: sleeve
  gradients and waveform bar styles derive only from integer math on stable
  inputs — no `Math.random`/`Date.now` in render, heights stay `.toFixed(2)`.
- Played waveform bars now use `color-mix(in oklch, var(--brand-from),
  var(--brand-to) N%)` per bar; the unplayed class is `bg-muted-foreground/30`.
- Reveal-gated sections render `data-state="hidden"`; CSS guards un-hide for
  no-JS (`@media (scripting: none)`) and reduced-motion users. The observer
  uses a 9999px top rootMargin so content scrolled past (anchor jumps) still
  reveals.
- SongFeed subscribes to `playing`/`isActive` only — never `usePlayerTime`
  (per-tick re-render protection).
- The feed hides the upload date below `sm` so titles keep room on phones.

## Next steps

- Review the redesign in the browser, then commit it.
- If the #6 remote migration/backfill hasn't been done yet: apply migrations
  remotely and visit /explore logged-in on desktop once (see docs/changelog.md).
