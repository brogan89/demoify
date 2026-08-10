import { describe, expect, it, vi } from "vitest";

import {
  CREDITS_PER_USD,
  CREDIT_PACKAGES,
  ENGAGEMENT_CREDITS,
  NEW_ARTIST_CREDITS,
  PLAY_CREDIT_SECONDS,
  STARTING_CREDITS,
  STRIPE_MIN_CHARGE_CENTS,
  UPLOAD_COST,
  creditsEnabled,
  discountedPriceCents,
  formatUsd,
  getPackage,
  isChargeable,
  packagesUsableWith,
  uploadsRemaining,
} from "./credits";

describe("formatUsd", () => {
  it("renders cents as dollars, always to 2dp", () => {
    expect(formatUsd(150)).toBe("$1.50");
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(5)).toBe("$0.05");
    expect(formatUsd(99)).toBe("$0.99");
    expect(formatUsd(1500)).toBe("$15.00");
  });

  // Pins the current format: no thousands separator, no locale awareness.
  it("does not group thousands", () => {
    expect(formatUsd(100000)).toBe("$1000.00");
  });
});

describe("uploadsRemaining", () => {
  it("floors the balance into whole uploads", () => {
    expect(uploadsRemaining(100)).toBe(10);
    expect(uploadsRemaining(15)).toBe(1);
    expect(uploadsRemaining(10)).toBe(1);
    expect(uploadsRemaining(9)).toBe(0);
    expect(uploadsRemaining(0)).toBe(0);
  });

  // Characterization: Math.floor on a negative goes further negative, so a debt
  // balance reports -1 rather than 0. Callers gate on `> 0`, so this is currently
  // harmless — but any UI that renders the number directly would show it.
  it("reports a negative count for a negative balance", () => {
    expect(uploadsRemaining(-5)).toBe(-1);
  });
});

describe("getPackage", () => {
  it("finds each package by id", () => {
    expect(getPackage("starter")).toEqual({
      id: "starter",
      label: "Starter",
      credits: 150,
      priceCents: 150,
    });
    expect(getPackage("creator")?.credits).toBe(500);
    expect(getPackage("studio")?.credits).toBe(1500);
  });

  it("returns undefined for an unknown id", () => {
    expect(getPackage("nope")).toBeUndefined();
    expect(getPackage("")).toBeUndefined();
  });
});

// The self-hosting kill switch. Off means uploads are free and unlimited, so
// getting this backwards either charges self-hosters or gives away the hosted
// product.
describe("creditsEnabled", () => {
  it("is on when unset — the hosted default", () => {
    expect(process.env.CREDITS_ENABLED).toBeUndefined();
    expect(creditsEnabled()).toBe(true);
  });

  it("is off for the exact string 'false'", () => {
    vi.stubEnv("CREDITS_ENABLED", "false");
    expect(creditsEnabled()).toBe(false);
  });

  // These are the cases that matter: a self-hoster who writes CREDITS_ENABLED=FALSE
  // or =0 still gets charged. Pinned so the looseness is a known quantity rather
  // than a surprise bug report.
  it.each(["true", "FALSE", "False", "0", "", "no", "off"])(
    "stays on for %o",
    (value) => {
      vi.stubEnv("CREDITS_ENABLED", value);
      expect(creditsEnabled()).toBe(true);
    },
  );
});

describe("credit economics", () => {
  it("gives new users exactly 10 free uploads", () => {
    expect(STARTING_CREDITS / UPLOAD_COST).toBe(10);
  });

  it("gives an additional artist exactly one free upload's worth", () => {
    expect(NEW_ARTIST_CREDITS).toBe(UPLOAD_COST);
  });

  it("prices credits at 1 credit per cent", () => {
    expect(CREDITS_PER_USD).toBe(100);
  });

  it("pays out like/comment/play engagement at 1/3/2", () => {
    expect(ENGAGEMENT_CREDITS).toEqual({ like: 1, comment: 3, play: 2 });
  });

  it("requires 30 seconds of listening to earn a play credit", () => {
    expect(PLAY_CREDIT_SECONDS).toBe(30);
  });

  // priceCents is stored per package so a future sale can lower it or grant
  // bonus credits. A package worse than the base rate would be a pricing bug.
  it("never sells a package below the base 1-credit-per-cent rate", () => {
    for (const pkg of CREDIT_PACKAGES) {
      expect(pkg.credits).toBeGreaterThanOrEqual(pkg.priceCents);
    }
  });

  it("has unique package ids, since getPackage resolves by id", () => {
    const ids = CREDIT_PACKAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// This is real money: discountedPriceCents is both the buy-page preview AND
// the unit_amount Stripe charges, and isChargeable is the only thing standing
// between a deep discount coupon and a sub-$0.50 session Stripe hard-rejects.
describe("discountedPriceCents", () => {
  it("takes a percentage off, rounding to the nearest cent", () => {
    expect(discountedPriceCents("PERCENT_OFF", 50, 150)).toBe(75);
    expect(discountedPriceCents("PERCENT_OFF", 33, 150)).toBe(100); // 49.5 rounds to 50 off
    expect(discountedPriceCents("PERCENT_OFF", 10, 1500)).toBe(1350);
  });

  it("takes a fixed amount off, clamped at zero", () => {
    expect(discountedPriceCents("FIXED_OFF", 200, 150)).toBe(0);
    expect(discountedPriceCents("FIXED_OFF", 100, 150)).toBe(50);
    expect(discountedPriceCents("FIXED_OFF", 1450, 1500)).toBe(50);
  });

  it("matches the identical math previously duplicated in the checkout route", () => {
    // Old route formula: Math.max(0, price - Math.round(price * amount / 100))
    for (const pack of CREDIT_PACKAGES) {
      for (const pct of [1, 25, 50, 96, 99]) {
        const legacy = Math.max(0, pack.priceCents - Math.round((pack.priceCents * pct) / 100));
        expect(discountedPriceCents("PERCENT_OFF", pct, pack.priceCents)).toBe(legacy);
      }
    }
  });
});

describe("isChargeable", () => {
  it("is the $0.50 Stripe minimum, boundary-exact", () => {
    expect(STRIPE_MIN_CHARGE_CENTS).toBe(50);
    expect(isChargeable(49)).toBe(false);
    expect(isChargeable(50)).toBe(true);
    expect(isChargeable(0)).toBe(false);
  });
});

describe("packagesUsableWith", () => {
  it("PERCENT_OFF 70 excludes Starter (45¢) but keeps Creator and Studio", () => {
    const ids = packagesUsableWith("PERCENT_OFF", 70).map((p) => p.id);
    expect(ids).toEqual(["creator", "studio"]);
  });

  // Boundary against the current package table: 96% leaves Studio at 60¢
  // (usable); 97% leaves it at 45¢ (nothing usable).
  it("PERCENT_OFF boundary sits between 96 and 97", () => {
    expect(packagesUsableWith("PERCENT_OFF", 96).map((p) => p.id)).toEqual(["studio"]);
    expect(packagesUsableWith("PERCENT_OFF", 97)).toEqual([]);
  });

  it("PERCENT_OFF 100 is usable nowhere — that's what FREE_CREDITS is for", () => {
    expect(packagesUsableWith("PERCENT_OFF", 100)).toEqual([]);
  });

  it("FIXED_OFF boundary sits between 1450 and 1451 against Studio", () => {
    expect(packagesUsableWith("FIXED_OFF", 1450).map((p) => p.id)).toEqual(["studio"]);
    expect(packagesUsableWith("FIXED_OFF", 1451)).toEqual([]);
  });

  it("a small discount applies everywhere", () => {
    expect(packagesUsableWith("PERCENT_OFF", 10)).toHaveLength(CREDIT_PACKAGES.length);
  });
});
