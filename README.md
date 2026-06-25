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

**Demoify** lets artists and producers share tracks — publicly or privately — under
one permanent link, push new versions without breaking that link, and collect
feedback right in the comments. Self-host your own instance and even federate your
public tracks into a shared [Explore](#federated-explore) feed. Built with
[Next.js](https://nextjs.org), Prisma, Better Auth, Cloudflare R2, and Stripe.

## Dev setup

### Prerequisites

- **Node.js 20+**
- **A Postgres database** — the easiest path is Docker (`just db` starts one
  pre-configured to match the default `DATABASE_URL`); a local `postgres` install
  or a hosted instance works too.
- **[just](https://github.com/casey/just)** (optional) — task runner for the
  recipes below. Install with `brew install just`.

### Quick start

```bash
just setup   # install deps, create .env, generate Prisma client, run migrations
just run     # start the dev server at http://localhost:3000
```

If you don't use `just`, run the equivalent steps manually:

```bash
npm install
cp .env.example .env          # then fill in the values below
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` and fill it in. Only the first group is required;
the rest enable optional features and stay dormant until configured.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string. |
| `BETTER_AUTH_SECRET` | ✅ | Auth signing secret — `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | ✅ | Base URL for auth callbacks (`http://localhost:3000`). |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL exposed to the browser. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enables Google login. |
| `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` | — | Enables Apple login. |
| `R2_*` (5 vars) | — | Cloudflare R2 (or any S3-compatible store) — enables song uploads. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Stripe — enables credit purchases. |
| `CREDITS_ENABLED` | — | `false` makes uploads free/unlimited and hides credit UI (see Self-hosting). Defaults to `true`. |
| `FEDERATION_HUB_URL` / `FEDERATION_TOKEN` | — | Submit this instance's public tracks to a shared Explore hub. |
| `FEDERATION_HUB_ENABLED` | — | `true` makes this instance a hub that accepts submissions. |

The app runs without the optional groups: social buttons, uploads, and
purchases simply stay disabled until their credentials are present.

## Self-hosting

Demoify is designed to run as your own instance. The upload "credit" cost is
purely a gate (there's no transcoding or AI behind it), so when you bring your
own storage there's no per-upload cost to meter:

- **Free, unlimited uploads** — set `CREDITS_ENABLED="false"`. Credits stop being
  charged, engagement rewards stop accruing, and all credit UI (the balance pill,
  the buy-credits page, upload cost labels) disappears. You can leave Stripe
  unconfigured entirely.
- **Bring your own storage** — uploads use the S3 API, so any S3-compatible store
  works (Cloudflare R2, AWS S3, MinIO, Backblaze B2). Point the `R2_*` vars at it:
  `R2_ACCOUNT_ID` builds the endpoint (`https://<id>.r2.cloudflarestorage.com`)
  for R2; for other providers, adjust the endpoint in `src/lib/r2.ts`. `R2_BUCKET`
  is the bucket and `R2_PUBLIC_URL` is the public base URL objects are served from.
- **Database** — production runs on Cloudflare D1 (a Worker binding, no
  connection string). See `DEPLOYMENT.md` for the full setup.

### Federated Explore

Your instance can share its public tracks with a central hub (e.g. `demoify.app`)
so they show up in the hub's Explore feed alongside everyone else's. Only metadata
is shared — audio keeps streaming from your own storage, and listeners click
through to your instance to play.

To join a hub: ask the hub operator for a token, then set `FEDERATION_HUB_URL` and
`FEDERATION_TOKEN`. From then on, making a song public (or uploading a version to a
public song) submits it to the hub; making it private or deleting it removes it.
Submissions start as "pending" until the hub operator approves them.

Running your own hub and the submission protocol are documented in
[`docs/federation.md`](docs/federation.md).

## Going public / rotating secrets

Before exposing an instance (or open-sourcing a fork), rotate anything that ever
lived in a local `.env`:

- Regenerate `BETTER_AUTH_SECRET` — `openssl rand -base64 32`.
- Rotate your storage keys (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`).
- Roll any Stripe / Resend / OAuth secrets that were used in development.
- Confirm no secrets are tracked: `git ls-files | grep -i env` should list only
  `.env.example`. (`.env*` is gitignored.)

### Common tasks

| Command | What it does |
| --- | --- |
| `just run` | Start the dev server. |
| `just db` | Start the local Postgres database (Docker) and wait until ready. |
| `just db-stop` | Stop the local Postgres database (data is preserved). |
| `just migrate` | Create/apply a migration (`npx prisma migrate dev`). |
| `just generate` | Regenerate the Prisma client. |
| `just studio` | Open Prisma Studio to inspect the database. |
| `just users` | List signed-up users with song count, credits, and join date. |
| `just reset` | Drop and recreate the database (destructive). |
| `just build` | Production build. |
| `just lint` | Run ESLint. |

Run `just` with no arguments to list every recipe.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
