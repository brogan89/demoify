// Dev-only endpoint: clone production D1 into the local dev D1 (see
// scripts/pull-prod-db.mjs). Triggered by the floating dev button. Hard-gated to
// non-production so it can never run on the deployed worker.

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production." }, { status: 403 });
  }
  // Pointless under `npm run dev:remote` — the app reads the remote D1, not the
  // local one we'd be populating.
  if (process.env.DEV_REMOTE_DB === "1") {
    return Response.json(
      { error: "Run plain `npm run dev` (not dev:remote) to pull into the local DB." },
      { status: 400 },
    );
  }

  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);

  try {
    const { stdout, stderr } = await run(process.execPath, ["scripts/pull-prod-db.mjs"], {
      cwd: process.cwd(),
      timeout: 5 * 60 * 1000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return Response.json({ ok: true, output: stdout + stderr });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    return Response.json(
      {
        error:
          output ||
          e.message ||
          "Pull failed. Is `wrangler login` done? Check the dev server logs.",
      },
      { status: 500 },
    );
  }
}
