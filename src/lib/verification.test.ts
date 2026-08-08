import { describe, expect, it, vi } from "vitest";

import { requireEmailVerification } from "./verification";

// The gate that makes unverified accounts read-only. Its whole design note
// (src/lib/verification.ts:5-14, AGENTS.md) is about failing *closed*: the
// previous behaviour derived the flag from whether email was configured, so a
// rotated RESEND_API_KEY silently switched verification off platform-wide. These
// tests pin the replacement.
describe("requireEmailVerification", () => {
  it("is on when the flag is exactly 'true', even outside production", () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "true");
    vi.stubEnv("NODE_ENV", "development");
    expect(requireEmailVerification()).toBe(true);
  });

  it("is off when the flag is exactly 'false' — an explicit opt-out beats production", () => {
    vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", "false");
    vi.stubEnv("NODE_ENV", "production");
    expect(requireEmailVerification()).toBe(false);
  });

  it("FAILS CLOSED: unset in production means on", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(process.env.REQUIRE_EMAIL_VERIFICATION).toBeUndefined();
    expect(requireEmailVerification()).toBe(true);
  });

  it("is off outside production when unset, so the gate is invisible under `next dev`", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(requireEmailVerification()).toBe(false);
  });

  // Only the two exact strings are honoured. Anything else falls through to
  // NODE_ENV rather than being treated as an opt-out — so a typo can't quietly
  // disable the gate in production.
  it.each(["TRUE", "1", "yes", "", "off", "False"])(
    "does not accept %o as an opt-out — falls through to NODE_ENV",
    (value) => {
      vi.stubEnv("REQUIRE_EMAIL_VERIFICATION", value);
      vi.stubEnv("NODE_ENV", "production");
      expect(requireEmailVerification()).toBe(true);
    },
  );

  // The property the docblock exists for: this must not be derived from whether
  // email can actually be delivered. An unset Resend key must never silently
  // unlock the whole site.
  it("is independent of RESEND_API_KEY (the fail-open this replaced)", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(requireEmailVerification()).toBe(true);

    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    expect(requireEmailVerification()).toBe(true);
  });
});
