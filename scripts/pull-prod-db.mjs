// Clone the production D1 database into the local dev D1, so `npm run dev` renders
// real data *and* allows writes / login (unlike `npm run dev:remote`, which is
// read-only against production).
//
// Flow: export production (schema + data) to a temp .sql file, drop the local
// schema, then ingest the dump (which recreates every table + index and inserts
// the data). Dropping happens in place — against the same DB file the dev server's
// local emulation uses — rather than deleting the SQLite file, so a running dev
// server picks up the new data on its next query (just refresh). See the drop-order
// note below for the foreign-key handling.
//
// Requires `wrangler login` (same as `npm run dev:remote`). Run via `npm run
// db:pull`, or trigger it from the dev-only button in the app.

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DB = "demoify";
const wrangler = fileURLToPath(new URL("../node_modules/.bin/wrangler", import.meta.url));

function wr(args) {
  // Inherit stderr so wrangler's own progress/errors stream through; capture
  // stdout for the few commands we need to read.
  return execFileSync(wrangler, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

// The user tables currently in the local DB (everything bar SQLite/Cloudflare
// internals), so we clear exactly what's there regardless of schema drift.
function localTables() {
  const out = wr([
    "d1", "execute", DB, "--local", "-y", "--json", "--command",
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  ]);
  const json = JSON.parse(out);
  return (json[0]?.results ?? []).map((r) => r.name);
}

const dir = mkdtempSync(join(tmpdir(), "demoify-d1-"));
const dump = join(dir, "prod-dump.sql");
const reset = join(dir, "reset.sql");

try {
  console.log("→ Exporting production D1 (requires `wrangler login`)…");
  wr(["d1", "export", DB, "--remote", "--output", dump, "-y"]);

  const tables = localTables();
  console.log(`→ Dropping ${tables.length} local tables…`);
  // The dump recreates every table and index outright (its CREATE INDEX statements
  // have no IF NOT EXISTS), so drop the existing schema first. `sqlite_master` lists
  // tables in creation order (parents before children), and D1 enforces foreign keys
  // even under `defer_foreign_keys`, so drop in reverse — children before parents.
  const lines = [
    "PRAGMA defer_foreign_keys=TRUE;",
    ...[...tables].reverse().map((t) => `DROP TABLE IF EXISTS "${t}";`),
  ];
  writeFileSync(reset, lines.join("\n") + "\n");
  wr(["d1", "execute", DB, "--local", "-y", "--file", reset]);

  console.log("→ Importing production data into local D1…");
  wr(["d1", "execute", DB, "--local", "-y", "--file", dump]);

  console.log(`✓ Local D1 now mirrors production. Refresh the app to see the data.`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
