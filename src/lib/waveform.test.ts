import { describe, expect, it } from "vitest";

import {
  WAVEFORM_BARS,
  computePeaks,
  downsamplePeaks,
  parsePeaksJson,
  sanitizePeaks,
  serializePeaks,
} from "./waveform";

/** A minimal AudioBuffer stand-in: computePeaks only calls getChannelData(0). */
function fakeBuffer(samples: number[]): AudioBuffer {
  return {
    getChannelData: () => new Float32Array(samples),
  } as unknown as AudioBuffer;
}

/** An array of `n` copies of `v`, long enough to clear sanitizePeaks' minimum. */
function fill(v: number, n = 16): number[] {
  return new Array(n).fill(v);
}

describe("computePeaks", () => {
  it("returns exactly WAVEFORM_BARS entries regardless of input length", () => {
    expect(computePeaks(fakeBuffer([0, 0.5, -1, 0.25]))).toHaveLength(WAVEFORM_BARS);
    expect(computePeaks(fakeBuffer(fill(0.5, 10_000)))).toHaveLength(WAVEFORM_BARS);
  });

  it("takes the absolute value, so troughs count as loudly as peaks", () => {
    const peaks = computePeaks(fakeBuffer([0, 0.5, -1, 0.25]));
    expect(peaks.slice(0, 4)).toEqual([0, 0.5, 1, 0.25]);
  });

  it("zero-pads the tail when there are fewer samples than bars", () => {
    const peaks = computePeaks(fakeBuffer([0, 0.5, -1, 0.25]));
    expect(peaks.slice(4).every((p) => p === 0)).toBe(true);
  });

  it("normalizes so the loudest bar is full height regardless of gain", () => {
    // 1600 samples → block of 10. First block peaks at 1.0, the rest at 0.5.
    const samples = [...fill(1, 10), ...fill(0.5, 1590)];
    const peaks = computePeaks(fakeBuffer(samples));
    expect(peaks[0]).toBe(1);
    expect(peaks[1]).toBe(0.5);
  });

  it("scales a quiet track up to full height", () => {
    // Every bucket sees the same 0.25 peak, so normalization takes them all to 1.
    const peaks = computePeaks(fakeBuffer(fill(0.25, 320)));
    expect(peaks.every((p) => p === 1)).toBe(true);
  });

  // The `max > 0 ?` guard at src/lib/waveform.ts:33. Without it, silence divides
  // by zero and every bar renders as NaN.
  it("does not divide by zero on silence", () => {
    const peaks = computePeaks(fakeBuffer(fill(0, 100)));
    expect(peaks).toHaveLength(WAVEFORM_BARS);
    expect(peaks.every((p) => p === 0)).toBe(true);
    expect(peaks.some(Number.isNaN)).toBe(false);
  });
});

describe("downsamplePeaks", () => {
  it("keeps the max of each bucket so transients stay visible", () => {
    expect(downsamplePeaks([0, 1, 0, 1, 0, 1, 0, 1], 4)).toEqual([1, 1, 1, 1]);
    expect(downsamplePeaks([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 3)).toEqual([
      0.2, 0.5, 0.8,
    ]);
  });

  it("produces exactly `bars` entries", () => {
    expect(downsamplePeaks(fill(0.5, 160), 40)).toHaveLength(40);
    expect(downsamplePeaks(fill(0.5, 160), 1)).toHaveLength(1);
  });

  // src/lib/waveform.ts:43 returns the input array itself, not a copy — so a
  // caller that mutates the result mutates the source. `toBe` pins that.
  it("returns the input array by reference when no downsampling is needed", () => {
    const peaks = [1, 2, 3];
    expect(downsamplePeaks(peaks, 5)).toBe(peaks);
    expect(downsamplePeaks(peaks, 3)).toBe(peaks);
    expect(downsamplePeaks(peaks, 0)).toBe(peaks);
    expect(downsamplePeaks(peaks, -1)).toBe(peaks);
  });
});

// The hostile-input validator. saveWaveform accepts peaks straight from the
// browser, so everything here is attacker-controlled.
describe("sanitizePeaks", () => {
  it("accepts a plausibly-sized array of finite numbers", () => {
    expect(sanitizePeaks(fill(0.5, 16))).toHaveLength(16);
    expect(sanitizePeaks(fill(0.5, 160))).toHaveLength(160);
    expect(sanitizePeaks(fill(0.5, 512))).toHaveLength(512);
  });

  it("rejects arrays outside the 16–512 length window", () => {
    expect(sanitizePeaks(fill(0.5, 15))).toBeNull();
    expect(sanitizePeaks(fill(0.5, 513))).toBeNull();
    expect(sanitizePeaks([])).toBeNull();
  });

  it("rejects anything that isn't an array", () => {
    expect(sanitizePeaks(null)).toBeNull();
    expect(sanitizePeaks(undefined)).toBeNull();
    expect(sanitizePeaks("0.5")).toBeNull();
    expect(sanitizePeaks(42)).toBeNull();
    expect(sanitizePeaks({ length: 20 })).toBeNull();
  });

  it("clamps values into 0..1", () => {
    expect(sanitizePeaks([2, -1, 0.5, ...fill(0, 13)])?.slice(0, 3)).toEqual([1, 0, 0.5]);
  });

  it("rounds to 3 decimal places, half-up", () => {
    expect(sanitizePeaks([0.12345, ...fill(0, 15)])?.[0]).toBe(0.123);
    expect(sanitizePeaks([0.1235, ...fill(0, 15)])?.[0]).toBe(0.124);
    expect(sanitizePeaks([0.0005, ...fill(0, 15)])?.[0]).toBe(0.001);
    expect(sanitizePeaks([0.9999, ...fill(0, 15)])?.[0]).toBe(1);
  });

  // src/lib/waveform.ts:67 returns rather than continues, so one bad element
  // rejects the entire array instead of being silently skipped.
  it("rejects the whole array when any single element is bad", () => {
    expect(sanitizePeaks([NaN, ...fill(0, 15)])).toBeNull();
    expect(sanitizePeaks([Infinity, ...fill(0, 15)])).toBeNull();
    expect(sanitizePeaks(["0.5", ...fill(0, 15)])).toBeNull();
    expect(sanitizePeaks([null, ...fill(0, 15)])).toBeNull();
    expect(sanitizePeaks([...fill(0, 15), undefined])).toBeNull();
  });
});

describe("parsePeaksJson", () => {
  it("round-trips serializePeaks", () => {
    const peaks = sanitizePeaks(fill(0.5, 160))!;
    expect(parsePeaksJson(serializePeaks(peaks))).toEqual(peaks);
  });

  it("tolerates missing or malformed JSON as null", () => {
    expect(parsePeaksJson(null)).toBeNull();
    expect(parsePeaksJson(undefined)).toBeNull();
    expect(parsePeaksJson("")).toBeNull();
    expect(parsePeaksJson("not json")).toBeNull();
    expect(parsePeaksJson("{")).toBeNull();
  });

  it("rejects well-formed JSON that isn't a peaks array", () => {
    expect(parsePeaksJson('{"a":1}')).toBeNull();
    expect(parsePeaksJson("null")).toBeNull();
    expect(parsePeaksJson("[]")).toBeNull();
  });

  // The 8 KB cap is checked before parsing, so an oversized payload is rejected
  // even when its contents would sanitize cleanly.
  it("rejects payloads over 8 KB before parsing them", () => {
    const oversized = JSON.stringify(new Array(512).fill(0.12345678901234567));
    expect(oversized.length).toBeGreaterThan(8 * 1024);
    expect(sanitizePeaks(JSON.parse(oversized))).not.toBeNull();
    expect(parsePeaksJson(oversized)).toBeNull();
  });
});

describe("WAVEFORM_BARS", () => {
  it("is 160", () => {
    expect(WAVEFORM_BARS).toBe(160);
  });
});
