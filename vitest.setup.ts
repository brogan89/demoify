// Keeps the suite hermetic.
//
// Several of these units are env-driven kill switches whose *unset* behaviour is
// the thing worth pinning: creditsEnabled() is on unless CREDITS_ENABLED is
// exactly "false", requireEmailVerification() falls back to NODE_ENV when unset,
// and isPublicUrlUnder() fails closed with no R2_PUBLIC_URL. Vitest inherits the
// parent process environment, so any of these exported in a developer's shell
// (or set on the CI job) would silently rewrite the baseline those tests assert
// against — verified: with CREDITS_ENABLED=false and REQUIRE_EMAIL_VERIFICATION=false
// exported, three tests fail without this scrub.
//
// Note this is about inherited environment, not dotenv: Vitest does not load the
// repo's gitignored .env into process.env (confirmed — BETTER_AUTH_URL is set
// there and is undefined in tests). The scrub is what makes "unset" mean unset.
//
// src/lib/r2.ts also captures R2_PUBLIC_URL into a module-level const at import
// time, so the state has to be right before the module evaluates. setupFiles run
// before test modules do, which is why this belongs here and not in a beforeEach.
//
// Every test that depends on one of these sets it explicitly.
const ENV_READ_BY_UNITS_UNDER_TEST = [
  "ADMIN_EMAILS",
  "CREDITS_ENABLED",
  "REQUIRE_EMAIL_VERIFICATION",
  "RESEND_API_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
];

// NODE_ENV is deliberately absent: Vitest sets it to "test", which is the correct
// baseline for requireEmailVerification()'s fall-through branch.
for (const key of ENV_READ_BY_UNITS_UNDER_TEST) delete process.env[key];
