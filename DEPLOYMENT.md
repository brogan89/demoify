# Deploying Demoify to Cloudflare

Production runs as a Cloudflare Worker built by [OpenNext](https://opennext.js.org/cloudflare),
with Postgres on Neon (via the Neon serverless driver), R2 for audio, Resend for email, and
Stripe for credits. Served from **demoify.music**.

> **Note:** the original plan used Cloudflare Hyperdrive + `node-postgres` (`pg`). That path is
> currently broken under OpenNext (`pg` pulls `pg-cloudflare`, which fails to bundle — open
> upstream issue). We use Prisma's **Neon serverless driver** adapter instead: it speaks
> WebSocket, needs no Hyperdrive, and is the canonical Prisma-on-Workers setup. Same DB provider
> (Neon); local dev now also uses a Neon branch instead of Docker Postgres.

> **Plan note:** the Worker bundle is ~4.5 MB gzip, over the 3 MB free-tier limit — needs the
> **Workers Paid** plan (10 MB limit).

The code/config is committed. The steps below provision the external accounts and fill the
placeholders. Do them roughly in order.

---

## 1. Database — Neon

1. Create a project at <https://neon.tech>. Grab two connection strings:
   - **Pooled** (host contains `-pooler`) → the app's `DATABASE_URL` secret (the Neon
     serverless driver uses this).
   - **Direct** (no `-pooler`) → for running migrations.
2. Run the first migration against Neon (direct URL):
   ```
   DATABASE_URL="<NEON_DIRECT_URL>" npx prisma migrate deploy
   ```
3. `DATABASE_URL` (pooled) is set as a Worker secret in step 6 — there's no Hyperdrive binding.

   For **local dev**, point `.env`'s `DATABASE_URL` at a Neon branch (e.g. a `dev` branch) too;
   the serverless driver can't talk to a plain local Postgres.

## 2. Domain — demoify.music

1. `.music` isn't sold by Cloudflare Registrar — register it at a registrar that supports the TLD.
2. Add the domain to Cloudflare (**Add site → Full setup**) and set the registrar's nameservers
   to the two Cloudflare gives you. Wait for "Active".
3. In `wrangler.jsonc`, uncomment the `routes` block so the Worker serves `demoify.music`.

## 3. R2 (already created — `demoify` bucket)

1. Attach a public custom domain to the bucket: R2 → `demoify` → **Settings → Public access →
   Custom domain** → `cdn.demoify.music` (Cloudflare adds the DNS record).
2. CORS already includes `https://demoify.music` in `r2-cors.json`. Re-apply it:
   ```
   npx wrangler r2 bucket cors set demoify --file r2-cors.json
   ```
3. Set `R2_PUBLIC_URL` secret to `https://cdn.demoify.music` (step 6).

## 4. Email — Resend

1. Create an account at <https://resend.com>, add domain `demoify.music`, and add the SPF/DKIM
   DNS records it gives you to Cloudflare DNS. Wait for verification.
2. Create an API key → that's `RESEND_API_KEY` (step 6).
3. `EMAIL_FROM` defaults to `Demoify <noreply@demoify.music>` — override via secret if desired.

## 5. Stripe (live)

1. Switch to live mode, copy the live `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint → `https://demoify.music/api/credits/webhook`, event
   `checkout.session.completed`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.

## 6. Worker secrets

Set each as a Worker secret (one prompt per command), or in the dashboard
(Workers → demoify → Settings → Variables):

```
npx wrangler secret put DATABASE_URL            # Neon POOLED connection string
npx wrangler secret put BETTER_AUTH_SECRET      # openssl rand -hex 32
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET               # demoify
npx wrangler secret put R2_PUBLIC_URL           # https://cdn.demoify.music
npx wrangler secret put RESEND_API_KEY
# Optional social login:
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`BETTER_AUTH_URL` is a plain var in `wrangler.jsonc` (not a secret).

## 7. First deploy

Locally:
```
npm run deploy        # opennextjs-cloudflare build && deploy
```
Or push to `main` and let GitHub Actions do it (see below).

### GitHub Actions secrets (for CI in `.github/workflows/deploy.yml`)
- `CLOUDFLARE_API_TOKEN` — token with Workers Scripts + Hyperdrive edit perms.
- `CLOUDFLARE_ACCOUNT_ID`
- `NEON_DIRECT_URL` — Neon direct connection string (migrations step).

---

## Local preview before shipping

```
npm run preview       # runs the real Workers runtime locally via OpenNext
```
Both `npm run dev` and `npm run preview` read `DATABASE_URL` from `.env` (point it at a Neon
branch).

## Verification checklist
- [ ] `npm run preview` boots; sign-up works.
- [ ] `prisma migrate deploy` applied to Neon.
- [ ] Sign up on demoify.music → verification email arrives → verify → log in.
- [ ] Password reset email arrives and completes.
- [ ] Upload an MP3 → plays back from `cdn.demoify.music`.
- [ ] Stripe checkout → credits increment (webhook 200).
- [ ] Push to `main` → Actions deploys cleanly.
