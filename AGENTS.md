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

# The email-verification write gate

Unverified accounts are **read-only**: they can browse and play, but every
mutating server action and route handler goes through `requireVerifiedUser()`
in `src/lib/session.ts`. `getCurrentUser()` remains the helper for read paths —
an unverified user must still be able to *see* the site.

**Adding a new server action?** It needs the gate. `npm run check:gates` fails
the build otherwise; genuine non-writers go in that script's `EXEMPT` list with
a reason.

`REQUIRE_EMAIL_VERIFICATION` controls enforcement: unset means **on in
production, off under `next dev`** — so the gate is invisible locally by
default. Set it to `"true"` in `.env` to exercise the production path (you'll
want `RESEND_API_KEY` too, or nobody can actually verify). It is deliberately
independent of whether email is configured: an unset Resend key must never
silently unlock the whole site.
