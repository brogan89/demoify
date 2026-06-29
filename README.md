<div align="center">

```
██████╗ ███████╗███╗   ███╗ ██████╗ ██╗███████╗██╗   ██╗
██╔══██╗██╔════╝████╗ ████║██╔═══██╗██║██╔════╝╚██╗ ██╔╝
██║  ██║█████╗  ██╔████╔██║██║   ██║██║█████╗   ╚████╔╝ 
██║  ██║██╔══╝  ██║╚██╔╝██║██║   ██║██║██╔══╝    ╚██╔╝  
██████╔╝███████╗██║ ╚═╝ ██║╚██████╔╝██║██║        ██║   
╚═════╝ ╚══════╝╚═╝     ╚═╝ ╚═════╝ ╚═╝╚═╝        ╚═╝   
```

### GitHub for songs — share versioned demos, get feedback, and let bands collaborate.

[![Deploy](https://github.com/brogan89/demoify/actions/workflows/deploy.yml/badge.svg)](https://github.com/brogan89/demoify/actions/workflows/deploy.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Better Auth](https://img.shields.io/badge/Better%20Auth-1.x-7C3AED?style=flat-square)](https://www.better-auth.com)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-22C55E?style=flat-square)](https://github.com/brogan89/demoify/issues)

</div>

---

**Demoify** is a versioned demo-sharing platform for musicians — think "GitHub for
songs." Artists and producers share tracks publicly or privately under one
permanent link, push new versions without breaking that link, and collect feedback
in timestamped comments. It runs entirely on Cloudflare's edge (Workers + D1 + R2)
and is open source, so you can [host your own instance](#self-hosting) and even
[federate](#federated-explore) your public tracks into a shared Explore feed.

## Features

- **Permanent links, versioned audio** — every song lives at `/{artist}/{slug}`.
  Upload a new take and the same URL serves it; older versions stay available, each
  with its own changelog.
- **Feedback in context** — listeners and collaborators leave comments anchored to a
  specific version and (optionally) a timestamp in the track.
- **Public or private** — songs default to public and appear in Explore; flip one
  to private and it's visible only to band members.
- **Bands & roles** — a *band* owns the public handle, its songs, and its credits.
  Users join bands via memberships with `ADMIN` / `MANAGER` / `MEMBER` roles; one
  account can act as several artists and switch between them.
- **Explore & Artists** — a public discovery feed with search and a curated
  genre/subgenre filter (sortable by recent or most-liked), plus a dedicated
  search for finding bands themselves at [`/artists`](src/app/artists/page.tsx).
- **Account settings** — display name, avatar, email, and password are all
  self-serve at `/dashboard/settings`, including account deletion (guarded
  against leaving a band without an admin or orphaning songs).
- **Credits economy (optional)** — uploads cost credits; new artists get a starter
  balance, and engaging with *other* bands' songs (likes, comments, full plays)
  earns more. Buy top-ups via Stripe, redeem free-credit or discount coupon
  codes, or disable the whole economy for free, unlimited uploads (see
  [Self-hosting](#self-hosting)). See [`docs/credits-and-payments.md`](docs/credits-and-payments.md).
- **Tipping** — listeners can tip artists real money via Stripe Connect, split
  90% artist / 10% platform. See [`docs/tipping.md`](docs/tipping.md).
- **Federated Explore** — self-hosted instances can submit their public tracks to a
  central hub so everyone shares one discovery feed, with audio still served from
  each instance's own storage. See [`docs/federation.md`](docs/federation.md).
- **Admin tooling** — the operator can issue coupon codes and gift credits
  directly to a band from `/admin`, gated by an email allowlist. See
  [`docs/admin.md`](docs/admin.md).
- **Auth** — email/password plus optional Google and Apple sign-in (Better Auth),
  with transactional email via Resend.

Optional integrations (social login, uploads, payments, email) are **feature-gated**:
each stays dormant until its credentials are present, so the app boots and runs with
only the core config set.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) on React 19, TypeScript |
| Runtime / hosting | Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare) |
| Database | Cloudflare **D1** (SQLite) through Prisma 7 + `@prisma/adapter-d1` |
| Object storage | Cloudflare **R2** (S3-compatible) via the AWS SDK + presigned uploads |
| Auth | Better Auth (email/password, Google, Apple) |
| Payments | Stripe Checkout (credits) + Stripe Connect (tips) |
| Email | Resend |
| UI | Tailwind CSS 4 + shadcn/ui (Radix), Lucide icons |

> **Why D1?** The database is a Worker binding (`DB`) — there's no connection string,
> the app talks to it through Prisma's D1 adapter, and local dev uses an emulated D1
> so it works completely offline.

## Dev setup

### Prerequisites

- **Node.js 20+** (CI builds on Node 22).
- **[just](https://github.com/casey/just)** (optional) — task runner for the recipes
  below. Install with `brew install just`.

No database server to install: local dev runs against an **emulated D1** stored under
`.wrangler/` (offline, no Docker, no connection string).

### Quick start

```bash
just setup   # install deps, create .env, generate the Prisma client, apply local D1 migrations
just run     # start the dev server at http://localhost:3000
```

Without `just`, the equivalent steps:

```bash
npm install
cp .env.example .env                                  # then set BETTER_AUTH_SECRET (see below)
npx prisma generate                                   # generate the Prisma client
npx wrangler d1 migrations apply demoify --local      # apply migrations to the local D1
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Developing against production data

Local dev uses an empty emulated D1, so data-driven pages (e.g. **Explore**) look
empty until you create songs. To test those pages with **real production data**
instead, point dev at the live D1:

```bash
wrangler login    # once — remote bindings proxy through the Cloudflare API
just run-remote   # or: npm run dev:remote
```

This uses Cloudflare [remote bindings](https://developers.cloudflare.com/workers/development-testing/#remote-bindings):
nothing is copied to disk, and the data stays current. Writes are **blocked** by a
read-only guard ([`src/lib/db.ts`](src/lib/db.ts)) so testing can't mutate
production. That guard also blocks Better Auth's session writes, so **you stay
logged out** in this mode — public/logged-out views (Explore, song pages) work
fully; for logged-in flows, use the local `just run`. Plain `just run` is
unaffected and still offline.

### Environment variables

Copy `.env.example` to `.env` and fill it in. The app runs with just the core group;
the rest enable optional features and stay dormant until configured.

| Variable | Required | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | ✅ | Auth signing secret — `openssl rand -base64 32`. (Falls back to an insecure default if unset.) |
| `BETTER_AUTH_URL` | ✅ | Base URL for auth callbacks (`http://localhost:3000` in dev). |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL exposed to the browser. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enables Google login. |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | — | Enables Apple login. |
| `R2_*` (5 vars) | — | Cloudflare R2 (or any S3-compatible store) — enables song uploads. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Stripe — enables credit purchases and tips. |
| `RESEND_API_KEY` / `EMAIL_FROM` | — | Resend — sends verification / reset emails (logged to console otherwise). |
| `CREDITS_ENABLED` | — | `false` makes uploads free/unlimited and hides credit UI. Defaults to `true`. |
| `ADMIN_EMAILS` | — | Comma-separated emails allowed to manage coupons and gift credits at `/admin`. Unset disables the section for everyone. |
| `FEDERATION_HUB_URL` / `FEDERATION_TOKEN` | — | Submit this instance's public tracks to a shared Explore hub. |
| `FEDERATION_HUB_ENABLED` | — | `true` makes this instance a hub that accepts submissions. |
| `NEXT_PUBLIC_APP_VERSION` | — | Version label shown in the footer; set automatically by CI. |

> The app's database is the `DB` Worker binding, **not** `DATABASE_URL`. The
> `DATABASE_URL` entry in `.env.example` is only for the optional legacy Postgres
> helper scripts (e.g. `just users`) and isn't read by the app itself.

### Database & migrations

Migrations are plain SQL in [`migrations/`](migrations), applied with Wrangler:

```bash
npx wrangler d1 migrations apply demoify --local      # local dev (just migrate)
npx wrangler d1 migrations apply demoify --remote      # production  (just migrate-remote)
```

To add a migration, edit `prisma/schema.prisma`, then:

```bash
npx wrangler d1 migrations create demoify <name>
npx prisma migrate diff --from-local-d1 --to-schema prisma/schema.prisma --script > migrations/<file>.sql
npx prisma generate
```

## How it works

- **Uploads** go straight from the browser to R2 via a presigned `PUT` (the server
  never proxies the file). The presign route checks band-manage rights and — when
  the credit economy is on — that the band can afford the upload; the version row and
  the credit charge are written together so a failure refunds the charge.
- **Credits** are a per-band balance backed by an append-only `CreditTransaction`
  ledger (uploads spend, purchases and engagement rewards add). Stripe purchases are
  applied idempotently from the webhook. Engagement rewards are granted at most once
  per song per action. Coupon codes can grant free credits or discount a purchase,
  capped to one redemption per band *and* per user. Set `CREDITS_ENABLED=false` to
  switch the whole system off.
- **Explore** lists public songs that have at least one uploaded version. On a
  federation **hub**, approved tracks submitted by other instances are merged into
  the same feed and link out to their origin.
- **Tipping** uses Stripe Connect (Express): money moves directly to the artist's
  connected account with a 10% application fee — balances aren't touched locally.

## Self-hosting

Demoify is built to run as your own instance. The upload "credit" cost is purely a
gate (there's no transcoding or AI behind it), so when you bring your own storage
there's no real per-upload cost to meter:

- **Free, unlimited uploads** — set `CREDITS_ENABLED="false"`. Credits stop being
  charged, engagement rewards stop accruing, and all credit UI (the balance pill, the
  buy-credits page, upload cost labels) disappears. You can leave Stripe unconfigured.
- **Bring your own storage** — uploads use the S3 API, so any S3-compatible store
  works (Cloudflare R2, AWS S3, MinIO, Backblaze B2). Point the `R2_*` vars at it:
  `R2_ACCOUNT_ID` builds the R2 endpoint (`https://<id>.r2.cloudflarestorage.com`);
  for other providers, adjust the endpoint in [`src/lib/r2.ts`](src/lib/r2.ts).
  `R2_BUCKET` is the bucket and `R2_PUBLIC_URL` is the public base URL objects are
  served from.
- **Database & deploy** — production runs on Cloudflare D1 + Workers. The full
  walkthrough (domain, R2 bucket, secrets, CI) is in [`DEPLOYMENT.md`](DEPLOYMENT.md).

### Federated Explore

Your instance can share its public tracks with a central hub (e.g. `demoify.app`) so
they show up in the hub's Explore feed alongside everyone else's. Only metadata is
shared — audio keeps streaming from your own storage, and listeners click through to
your instance to play.

To join a hub: ask the operator for a token, then set `FEDERATION_HUB_URL` and
`FEDERATION_TOKEN`. From then on, making a song public (or uploading a version to a
public song) submits it; making it private or deleting it removes it. Submissions
start as "pending" until the hub approves them. Running your own hub and the full
submission protocol are documented in [`docs/federation.md`](docs/federation.md).

## Deployment

Everything runs on Cloudflare: a Worker built by OpenNext, D1 for data, R2 for audio,
Resend for email, Stripe for payments. Push to `main` and GitHub Actions migrates D1
and deploys; each deploy is versioned `vYYYY.MM.DD-<run#>`, shown in the site footer
and pushed back as a git tag. See [`DEPLOYMENT.md`](DEPLOYMENT.md) for first-time setup
and the required secrets.

## Project layout

```
migrations/            SQL migrations applied to D1 (numbered, additive)
prisma/schema.prisma   Data model (D1/SQLite provider)
scripts/               Admin helpers (e.g. federation.mjs → `just federation`)
src/app/               App Router pages + API routes (auth, upload, credits, tips, federation)
src/app/admin/         Operator-only pages (coupons, gift credits) — see docs/admin.md
src/components/        UI (song card/view, header/footer, upload, credits, …)
src/lib/               Core logic: db, auth, r2, stripe, credits, engagement, federation, genres, admin
docs/                  Deep-dives: credits-and-payments, admin, tipping, federation, mvp-plan
DEPLOYMENT.md          Cloudflare/D1/R2/Stripe/CI setup walkthrough
```

## Tasks

Common [`just`](https://github.com/casey/just) recipes (run `just` for the full list):

| Command | What it does |
| --- | --- |
| `just setup` | Install deps, create `.env`, generate the client, apply local D1 migrations. |
| `just run` | Start the dev server at `http://localhost:3000` (offline, local D1). |
| `just run-remote` | Start dev against the live production D1, read-only (needs `wrangler login`). |
| `just migrate` | Apply D1 migrations to the local database. |
| `just migrate-remote` | Apply D1 migrations to production. |
| `just generate` | Regenerate the Prisma client. |
| `just federation …` | Hub admin: register/trust/approve instances (see `docs/federation.md`). |
| `just build` | Production build. |
| `just lint` | Run ESLint. |

## Security & going public

Before exposing an instance (or open-sourcing a fork), rotate anything that ever
lived in a local `.env`:

- Regenerate `BETTER_AUTH_SECRET` — `openssl rand -base64 32`.
- Rotate your storage keys (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`).
- Roll any Stripe / Resend / OAuth secrets used in development.
- Confirm no secrets are tracked: `git ls-files | grep -i env` should list only
  `.env.example`. (`.env*` is gitignored.)

## Learn more

- [`DEPLOYMENT.md`](DEPLOYMENT.md) — production setup on Cloudflare.
- [`docs/credits-and-payments.md`](docs/credits-and-payments.md) — credit economy, Stripe Checkout, and coupons.
- [`docs/admin.md`](docs/admin.md) — operator tooling: coupon administration and gifting credits.
- [`docs/tipping.md`](docs/tipping.md) — artist payouts via Stripe Connect.
- [`docs/federation.md`](docs/federation.md) — the federated Explore protocol.
- [Next.js](https://nextjs.org/docs) · [Prisma](https://www.prisma.io/docs) · [Better Auth](https://www.better-auth.com/docs) · [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)

## Feedback

Have a bug or an idea? [Open an issue](https://github.com/brogan89/demoify/issues).
