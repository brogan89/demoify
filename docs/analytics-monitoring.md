# Analytics & Monitoring

This document describes the analytics and monitoring infrastructure for Demoify.

## Components

### 1. Usage Analytics (`src/lib/analytics.ts`)

Server-side analytics queries that aggregate data from D1 via Prisma.

**Metrics tracked:**
- **Signups** — new user registrations
- **Uploads** — new song projects created
- **Plays** — engagement-granted plays (full-listens by logged-in users)
- **Comments** — feedback left on songs
- **Likes** — hearts on songs
- **Revenue** — credit purchases + tip platform fees
- **Active users** — users with recent sessions

### 2. Admin Dashboard (`/admin/analytics`)

A server-rendered admin page available to users listed in `ADMIN_EMAILS`.

**Dashboard sections:**
- **Top stat cards** — total users, active users, songs, plays, MRR, credits
- **Charts** — time series for signups, uploads, plays, comments, revenue
- **Top songs** — ranked by play count
- **Recent activity** — real-time feed of signups, uploads, tips, purchases

### 3. Error Monitoring

**Client-side:**
- `src/components/error-monitor.tsx` — catches `window.onerror` and `unhandledrejection`
- Reports errors to `POST /api/analytics/error` which logs to Workers console

**Cloudflare Workers Observability:**
- Enabled in `wrangler.jsonc` via the `observability` block
- Head sampling rate: 1.0 (100% of requests logged — reduce at scale)
- View logs: `wrangler tail`
- Access Workers Logs in Cloudflare Dashboard > Workers & Pages > demoify > Logs

### 4. Revenue Tracking

**Local ledger (source of truth):**
- `credit_transaction` table tracks all purchases (reason: "purchase")
- `tip` table tracks all tips with platform fee
- Dashboard aggregates these directly

**Stripe API integration (for reconciliation):**
- `src/lib/stripe-analytics.ts` — queries Stripe for charges, transfers, balances
- Used for month-end reconciliation and audit

## Deployment

### Wrangler Secrets

Set these secrets for production:

```bash
# General
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put RESEND_API_KEY

# R2 storage
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET
npx wrangler secret put R2_PUBLIC_URL

# Stripe
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Admin emails (comma-separated)
npx wrangler secret put ADMIN_EMAILS
```

### GitHub Actions Secrets

For CI/CD to deploy, set these in the GitHub repo:

- `CLOUDFLARE_API_TOKEN` — Cloudflare API token with Workers + D1 + R2 permissions
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID

### Enabling Logpush

To send Workers logs to long-term storage:

```bash
# Create a Logpush job (destination: R2)
npx wrangler logpush create --dataset workers_trace_events \
  --destination "r2://demoify-logs/logs/{DATE}" \
  --logpush-name "demoify-workers-logs"
```

Update `wrangler.jsonc`: set `"logpush": true` in the `observability` block.

### Cron Trigger (Daily Analytics Snapshot)

To enable the daily analytics aggregation cron:

1. Create the cron handler at `src/app/api/cron/analytics/route.ts`
2. Uncomment the `triggers.crons` section in `wrangler.jsonc`
3. Deploy

## Accessing Logs & Metrics

| Tool | Command / URL |
|------|-------------|
| **Workers logs (tail)** | `npx wrangler tail` |
| **Workers logs (dashboard)** | Cloudflare Dashboard > Workers & Pages > demoify > Logs |
| **Stripe dashboard** | https://dashboard.stripe.com |
| **Admin analytics** | https://demoify.app/admin/analytics |
| **Cloudflare metrics** | Cloudflare Dashboard > Analytics & Logs > Workers |

## MRR Calculation

Monthly Recurring Revenue is estimated as:

```
MRR = (revenue_last_30_days / 30) * 30
```

Where `revenue_last_30_days` = credit purchases + tip platform fees (10%).

This will become more accurate when subscription tiers are launched (future feature).

For now, the dashboard shows:
- **Est. MRR** — smoothed 30-day trailing estimate
- **Total revenue** — all-time platform earnings
- **Revenue breakdown** — credits vs tips
