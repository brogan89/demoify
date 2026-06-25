// Federation hub admin: register self-hosted instances, trust them, and approve
// their submitted tracks. Talks to Cloudflare D1 via `wrangler d1 execute`, so it
// works against both the local emulated DB (default) and production (--remote).
//
// Usage:
//   node scripts/federation.mjs add "<name>" <baseUrl>   # register + print a token
//   node scripts/federation.mjs trust <baseUrl>          # auto-approve future tracks
//   node scripts/federation.mjs approve <baseUrl>         # approve pending tracks now
//   node scripts/federation.mjs list                     # list instances
//   node scripts/federation.mjs token                    # just print token + sha256
//
// Add --remote to any DB command to target production instead of local D1.
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DB = "demoify"; // database_name in wrangler.jsonc

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("hex");
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`; // escape for SQL literal
const stripSlash = (u) => (u ?? "").trim().replace(/\/$/, "");

const argv = process.argv.slice(2);
const remote = argv.includes("--remote");
const [cmd, ...args] = argv.filter((a) => a !== "--remote");

function usage() {
  console.log(`Commands (add --remote to target production):
  add "<name>" <baseUrl>   Register an instance and print a one-time token.
  trust <baseUrl>          Mark an instance trusted (its tracks auto-approve).
  approve <baseUrl>        Approve all pending tracks from an instance.
  list                     List registered instances.
  token                    Print a fresh token + its sha256 (no DB).`);
}

// `token` needs no database.
if (cmd === "token") {
  const t = newToken();
  console.log(`token:     ${t}`);
  console.log(`tokenHash: ${sha256(t)}`);
  process.exit(0);
}

if (!cmd || cmd === "help" || cmd === "--help") {
  usage();
  process.exit(cmd ? 0 : 1);
}

/** Run SQL against D1 and return parsed result rows (via --json). */
function runSql(sql) {
  const file = join(tmpdir(), `demoify-fed-${randomUUID()}.sql`);
  writeFileSync(file, sql);
  try {
    const out = execFileSync(
      "npx",
      ["wrangler", "d1", "execute", DB, remote ? "--remote" : "--local", "--json", "--file", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    // wrangler prints a JSON array of statement results when --json is set.
    const json = JSON.parse(out.slice(out.indexOf("[")));
    return json[0]?.results ?? [];
  } finally {
    unlinkSync(file);
  }
}

try {
  if (cmd === "add") {
    const name = args[0];
    const baseUrl = stripSlash(args[1]);
    if (!name || !baseUrl) {
      console.error('Usage: add "<name>" <baseUrl>');
      process.exit(1);
    }
    const id = randomUUID();
    const token = newToken();
    const tokenHash = sha256(token);
    runSql(
      `INSERT INTO federated_instance (id,name,baseUrl,tokenHash,trusted,createdAt) ` +
        `VALUES (${sqlStr(id)},${sqlStr(name)},${sqlStr(baseUrl)},${sqlStr(tokenHash)},0,CURRENT_TIMESTAMP);`,
    );
    console.log(`Registered "${name}" (${baseUrl})${remote ? " [remote]" : ""}.`);
    console.log(`\nGive that instance these env vars:`);
    console.log(`  FEDERATION_HUB_URL=${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-hub"}`);
    console.log(`  FEDERATION_TOKEN=${token}`);
    console.log(`\n(The token is shown once — only its hash is stored.)`);
  } else if (cmd === "trust") {
    const baseUrl = stripSlash(args[0]);
    runSql(`UPDATE federated_instance SET trusted=1 WHERE baseUrl=${sqlStr(baseUrl)};`);
    console.log(`Trusted ${baseUrl} (its future submissions auto-approve).`);
  } else if (cmd === "approve") {
    const baseUrl = stripSlash(args[0]);
    runSql(
      `UPDATE external_track SET status='approved' WHERE status='pending' ` +
        `AND instanceId=(SELECT id FROM federated_instance WHERE baseUrl=${sqlStr(baseUrl)});`,
    );
    console.log(`Approved pending tracks from ${baseUrl}.`);
  } else if (cmd === "list") {
    const rows = runSql(
      `SELECT i.name, i.baseUrl, i.trusted, ` +
        `(SELECT COUNT(*) FROM external_track t WHERE t.instanceId=i.id) AS tracks, ` +
        `(SELECT COUNT(*) FROM external_track t WHERE t.instanceId=i.id AND t.status='pending') AS pending ` +
        `FROM federated_instance i ORDER BY i.createdAt ASC;`,
    );
    if (rows.length === 0) console.log("No federated instances registered.");
    else console.table(rows);
  } else {
    usage();
    process.exit(1);
  }
} catch (err) {
  const msg = String(err?.stderr || err?.message || err);
  if (/no such table/i.test(msg)) {
    console.error("Federation tables don't exist yet — apply migrations first:");
    console.error(`  npx wrangler d1 migrations apply ${DB} ${remote ? "--remote" : "--local"}`);
  } else if (/UNIQUE constraint/i.test(msg)) {
    console.error("That baseUrl is already registered.");
  } else {
    console.error("Command failed:", msg);
  }
  process.exit(1);
}
