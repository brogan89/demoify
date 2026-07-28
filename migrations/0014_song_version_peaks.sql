-- Precomputed waveform peaks (issue #6). The player previously downloaded the
-- whole audio file and decoded it with AudioContext in every listener's browser
-- just to draw the waveform — which fails on mobile (decode/memory limits), so
-- phones only ever saw the fallback slider. Peaks are now computed once in the
-- uploader's browser at upload time and stored here as a JSON array of ~160
-- normalized floats (~1 KB), then served with song data so every device renders
-- the waveform without fetching audio. Null for versions uploaded before this
-- (or when the uploader's browser couldn't decode); those fall back to the old
-- client-side decode, which also backfills this column via saveWaveform.
--
-- Additive nullable column, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as 0012_credit_transaction_note.sql).

ALTER TABLE "song_version" ADD COLUMN "peaks" TEXT;
