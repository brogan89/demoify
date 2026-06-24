# Demoify

GitHub for songs — share versioned demos, gate uploads behind credits, and let
bands collaborate. Built with [Next.js](https://nextjs.org), Prisma, Better
Auth, Cloudflare R2, and Stripe.

## Dev setup

### Prerequisites

- **Node.js 20+**
- **A Postgres database** — local (`postgres`/Docker) or a hosted instance.
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
| `R2_*` (5 vars) | — | Cloudflare R2 — enables song uploads. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | Stripe — enables credit purchases. |

The app runs without the optional groups: social buttons, uploads, and
purchases simply stay disabled until their credentials are present.

### Common tasks

| Command | What it does |
| --- | --- |
| `just run` | Start the dev server. |
| `just migrate` | Create/apply a migration (`npx prisma migrate dev`). |
| `just generate` | Regenerate the Prisma client. |
| `just studio` | Open Prisma Studio to inspect the database. |
| `just reset` | Drop and recreate the database (destructive). |
| `just build` | Production build. |
| `just lint` | Run ESLint. |

Run `just` with no arguments to list every recipe.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
