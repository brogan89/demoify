#!/usr/bin/env node
/**
 * Fails the build if a mutating server action or route handler skips the email
 * verification write gate.
 *
 * The gate is applied by hand at ~20 call sites, so the failure mode isn't a bug
 * in requireVerifiedUser() — it's someone adding action number 21 six months
 * from now and reaching for getCurrentUser() because that's what the file next
 * to it does. This turns that into a red build instead of a silent hole.
 *
 * Exempt entries need a reason. Adding one is a deliberate act; forgetting the
 * gate is not.
 *
 * Run: npm run check:gates
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ACTIONS_DIR = "src/app/actions";
const GATE = "requireVerifiedUser(";

/** Exports that legitimately don't take the gate, and why. */
const EXEMPT = {
  "account.ts": {
    checkUsernameAvailable: "read-only availability probe, used pre-signup",
  },
  "projects.ts": {
    listBandProjects: "read-only query",
  },
  "coupons.ts": {
    validateCoupon: "read-only preview; writes nothing",
    applyCoupon: "delegates to redeemCoupon/validateCoupon, which are gated",
    createCoupon: "admin-gated via isCurrentUserAdmin",
    setCouponActive: "admin-gated via isCurrentUserAdmin",
  },
  "admin.ts": {
    giftCredits: "admin-gated via isCurrentUserAdmin",
  },
  "plays.ts": {
    recordPlay: "deliberately anonymous — play counts include logged-out listeners",
  },
  "bands.ts": {
    setActiveBand: "writes a cookie preference only, no user data",
  },
  "attribution.ts": {
    captureRefSource:
      "writes the first-touch channel cookie only, no user data, and must run " +
      "pre-signup by definition. Rate-limited via RL_PUBLIC. Same basis as setActiveBand.",
  },
  "subscribers.ts": {
    subscribeToLaunchUpdates:
      "pre-signup email capture — the callers are by definition logged out, so " +
      "the gate cannot apply. Defends itself instead: RL_PUBLIC keyed by IP, " +
      "format + length validation, and a single row in an unrelated table.",
  },
};

/** Route handlers that must call the gate, mapped to the symbol they need. */
const ROUTES = {
  "src/app/api/upload/presign/route.ts": GATE,
  "src/app/api/credits/checkout/route.ts": GATE,
  "src/app/api/tips/checkout/route.ts": GATE,
  "src/app/api/connect/onboard/route.ts": GATE,
  "src/app/api/auth/[...all]/route.ts": 'underLimit("RL_AUTH"',
};

const problems = [];

/** Split a file into [exportName, body] pairs, body running to the next export. */
function exportedFunctions(source) {
  const re = /export\s+async\s+function\s+([A-Za-z0-9_]+)/g;
  const found = [...source.matchAll(re)];
  return found.map((m, i) => {
    const start = m.index;
    const end = i + 1 < found.length ? found[i + 1].index : source.length;
    return [m[1], source.slice(start, end)];
  });
}

for (const file of readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts")).sort()) {
  const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
  const exempt = EXEMPT[file] ?? {};

  for (const [name, body] of exportedFunctions(source)) {
    const gated = body.includes(GATE);
    const isExempt = Object.hasOwn(exempt, name);

    if (!gated && !isExempt) {
      problems.push(
        `${ACTIONS_DIR}/${file}: ${name}() does not call ${GATE}).\n` +
          `    Add the gate:  const gate = await requireVerifiedUser();\n` +
          `                   if (!gate.ok) return { error: gate.error, code: gate.code };\n` +
          `    Or, if it genuinely writes nothing, add it to EXEMPT in this script with a reason.`,
      );
    }
    if (gated && isExempt) {
      problems.push(
        `${ACTIONS_DIR}/${file}: ${name}() is listed EXEMPT but does call the gate. ` +
          `Drop the stale exemption.`,
      );
    }
  }
}

for (const [path, needle] of Object.entries(ROUTES)) {
  let source;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    problems.push(`${path}: expected to exist and call ${needle}) — file not found. ` +
      `If it moved, update ROUTES in this script.`);
    continue;
  }
  if (!source.includes(needle)) {
    problems.push(`${path}: does not call ${needle}).`);
  }
}

if (problems.length > 0) {
  console.error(`\n✗ Unguarded write path${problems.length > 1 ? "s" : ""}:\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

console.log("✓ All mutating actions and routes call the write gate.");
