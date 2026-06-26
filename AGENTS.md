<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Dev against production data

`npm run dev` uses a local, empty D1, so data pages (e.g. /explore) look empty.
`npm run dev:remote` points local dev at the **live production D1** (requires
`wrangler login`) so real data renders. Writes are blocked in this mode by a
read-only guard in `src/lib/db.ts` — including Better Auth session writes, so
**you stay logged out**. Public/logged-out views work; for logged-in testing,
run without the guard or seed local data.
