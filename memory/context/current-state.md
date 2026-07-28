# Current state — demoify

_Last updated: 2026-07-29_

## Where things left off

- Implemented issue #6 (server-stored waveforms) — uncommitted in the working
  tree. Peaks are computed in the uploader's browser, stored on
  `SongVersion.peaks` (migration `0014_song_version_peaks.sql`, applied to
  local D1 only), and rendered width-adaptively so mobile finally shows
  waveforms. Legacy versions self-heal via the `saveWaveform` action when a
  band member views them on desktop. See docs/changelog.md for decisions.
- Before deploying: apply the migration remotely
  (`npx wrangler d1 migrations apply demoify --remote` or via CI, which
  migrates on deploy), then visit /explore once logged in on desktop to
  backfill the production catalog.

## Known gotchas

- The mobile waveform bug had two causes: 160 bars × 1px flex gaps exceeding
  phone-width containers (bars rounded to 0px — pure CSS, no error anywhere),
  and full-file `decodeAudioData` on listeners' devices. Fixing only the
  decode would not have made bars visible on phones.
- `WaveformBars` must render identical markup on server and first client
  render (width state starts at 0) — hydration mismatch is the failure mode if
  that changes.

## Next steps

- Close issue #6 once merged/deployed and the production backfill visit is done.
