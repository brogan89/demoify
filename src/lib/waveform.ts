// Shared waveform-peak helpers (issue #6). Peaks are computed once in the
// uploader's browser, stored on SongVersion as a small JSON array, and rendered
// everywhere without fetching or decoding audio — mobile browsers can't decode
// full tracks (memory/codec limits), which is why waveforms never rendered there.
// No "use client"/"use server" directive: the pure helpers run on both sides;
// `decodeToPeaks` touches browser audio APIs and is only called from client code.

export const WAVEFORM_BARS = 160;

// Sanity caps for stored/submitted peak arrays. Length is a range (not exactly
// WAVEFORM_BARS) so old rows keep rendering if the bar count ever changes.
const MIN_LENGTH = 16;
const MAX_LENGTH = 512;
const MAX_PEAKS_JSON = 8 * 1024;

/** Reduce raw PCM samples down to `WAVEFORM_BARS` normalized peaks (0..1). */
export function computePeaks(buffer: AudioBuffer): number[] {
  const channel = buffer.getChannelData(0);
  const block = Math.floor(channel.length / WAVEFORM_BARS) || 1;
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < WAVEFORM_BARS; i++) {
    let peak = 0;
    const start = i * block;
    for (let j = 0; j < block && start + j < channel.length; j++) {
      const v = Math.abs(channel[start + j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  // Normalize so the loudest bar is full-height regardless of overall gain.
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/**
 * Reduce `peaks` to at most `bars` entries, keeping the max of each bucket so
 * transients stay visible. Used to fit the waveform to narrow containers —
 * phone-width players can't fit all 160 bars (issue #6: 160 one-pixel gaps
 * alone exceed the container, rounding every bar to zero width).
 */
export function downsamplePeaks(peaks: number[], bars: number): number[] {
  if (bars <= 0 || peaks.length <= bars) return peaks;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    const start = Math.floor((i * peaks.length) / bars);
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / bars));
    let peak = 0;
    for (let j = start; j < end && j < peaks.length; j++) {
      if (peaks[j] > peak) peak = peaks[j];
    }
    out.push(peak);
  }
  return out;
}

/**
 * Validate an untrusted peaks value into a clean array, or null. Accepts only a
 * plausibly-sized array of finite numbers; clamps to 0..1 and rounds to 3
 * decimals (sub-pixel on a 48px-tall waveform, and keeps the JSON ~1 KB).
 */
export function sanitizePeaks(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length < MIN_LENGTH || input.length > MAX_LENGTH) return null;
  const out: number[] = [];
  for (const v of input) {
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out.push(Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000);
  }
  return out;
}

/** Serialize sanitized peaks for the SongVersion.peaks column. */
export function serializePeaks(peaks: number[]): string {
  return JSON.stringify(peaks);
}

/** Parse a stored SongVersion.peaks JSON string, tolerating bad data as null. */
export function parsePeaksJson(json: string | null | undefined): number[] | null {
  if (!json || json.length > MAX_PEAKS_JSON) return null;
  try {
    return sanitizePeaks(JSON.parse(json));
  } catch {
    return null;
  }
}

/**
 * Browser-only: decode audio bytes and reduce them to peaks (+ exact duration).
 * Throws on unsupported codec / decode failure — callers treat that as "no
 * peaks" and fall back.
 */
export async function decodeToPeaks(
  arrayBuffer: ArrayBuffer,
): Promise<{ peaks: number[]; duration: number }> {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return { peaks: computePeaks(audioBuffer), duration: audioBuffer.duration };
  } finally {
    void ctx.close();
  }
}
