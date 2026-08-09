import { describe, expect, it } from "vitest";

import {
  MAX_TIP_CENTS,
  MIN_TIP_CENTS,
  PLATFORM_FEE_PERCENT,
  TIP_PRESETS_CENTS,
  isValidTipAmount,
  splitTip,
} from "./tips";

// This is real money: splitTip's feeCents becomes Stripe's application_fee_amount
// on a destination charge, and artistCents is what actually reaches the artist's
// connected account.
describe("splitTip", () => {
  it("takes 10% on round amounts", () => {
    expect(splitTip(1000)).toEqual({ feeCents: 100, artistCents: 900 });
    expect(splitTip(500)).toEqual({ feeCents: 50, artistCents: 450 });
    expect(splitTip(200)).toEqual({ feeCents: 20, artistCents: 180 });
  });

  it("rounds a half-cent fee up, to the platform", () => {
    // 105 * 10 / 100 = 10.5 → Math.round gives 11, not 10.
    expect(splitTip(105)).toEqual({ feeCents: 11, artistCents: 94 });
  });

  it("rounds a sub-half-cent fee down, to the artist", () => {
    expect(splitTip(101)).toEqual({ feeCents: 10, artistCents: 91 });
    expect(splitTip(104)).toEqual({ feeCents: 10, artistCents: 94 });
  });

  it("handles both bounds", () => {
    expect(splitTip(MIN_TIP_CENTS)).toEqual({ feeCents: 10, artistCents: 90 });
    expect(splitTip(MAX_TIP_CENTS)).toEqual({ feeCents: 5000, artistCents: 45000 });
  });

  // The assertion that actually catches a bad refactor: whatever the rounding
  // does, the two halves must reconstitute the gross amount exactly, and neither
  // may be fractional — Stripe rejects non-integer cents.
  it("never loses or invents a cent, and never returns a fractional one", () => {
    for (let amount = MIN_TIP_CENTS; amount <= MAX_TIP_CENTS; amount += 7) {
      const { feeCents, artistCents } = splitTip(amount);
      expect(feeCents + artistCents).toBe(amount);
      expect(Number.isInteger(feeCents)).toBe(true);
      expect(Number.isInteger(artistCents)).toBe(true);
    }
  });
});

describe("isValidTipAmount", () => {
  it("accepts whole cents within the bounds, inclusive", () => {
    expect(isValidTipAmount(MIN_TIP_CENTS)).toBe(true);
    expect(isValidTipAmount(MAX_TIP_CENTS)).toBe(true);
    expect(isValidTipAmount(1234)).toBe(true);
  });

  it("rejects amounts outside the bounds", () => {
    expect(isValidTipAmount(MIN_TIP_CENTS - 1)).toBe(false);
    expect(isValidTipAmount(MAX_TIP_CENTS + 1)).toBe(false);
    expect(isValidTipAmount(0)).toBe(false);
    expect(isValidTipAmount(-100)).toBe(false);
  });

  it("rejects anything that isn't a whole number of cents", () => {
    expect(isValidTipAmount(100.5)).toBe(false);
    expect(isValidTipAmount(NaN)).toBe(false);
    expect(isValidTipAmount(Infinity)).toBe(false);
    expect(isValidTipAmount(-Infinity)).toBe(false);
  });
});

describe("tip constants", () => {
  it("charges a 10% platform fee", () => {
    expect(PLATFORM_FEE_PERCENT).toBe(10);
  });

  it("offers $2 / $5 / $10 presets", () => {
    expect(TIP_PRESETS_CENTS).toEqual([200, 500, 1000]);
  });

  it("bounds a single tip to $1–$500", () => {
    expect(MIN_TIP_CENTS).toBe(100);
    expect(MAX_TIP_CENTS).toBe(50000);
  });

  // A preset the validator rejects would render a button that always errors.
  it("keeps every preset within the accepted range", () => {
    for (const preset of TIP_PRESETS_CENTS) {
      expect(isValidTipAmount(preset)).toBe(true);
    }
  });
});
