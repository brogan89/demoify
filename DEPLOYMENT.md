# Deploying Demoify to Cloudflare

Everything runs on Cloudflare: a Worker built by [OpenNext](https://opennext.js.org/cloudflare),
**D1** (SQLite) for the database, R2 for audio, plus Resend for email and Stripe for credits.
Served from **demoify.app**.

> **DB note:** the plan first tried Neon + Hyperdrive (`pg` won't bundle under OpenNext), then the
> Neon serverless driver. We landed on **Cloudflare D1** so the database lives in the same account
> as everything else — a `DB` binding, no external connection string, and offline local dev.
> Prisma 7 needs the generator's `runtime = "workerd"` target to run on Workers (otherwise it
> compiles WASM at runtime, which Workers block). The D1 database (`demoify`,
> id `528fd335-23b4-4922-9e44-c83e94d50bd9`) is created and migrated (local + remote); signup was
> verified writing to it via `wrangler dev`.

> **Plan note:** the Worker bundle is ~4.5 MB gzip, over the 3 MB free-tier limit — needs the
> **Workers Paid** plan (10 MB limit).

The code/config is committed. The steps below provision the external accounts and fill the
placeholders. Do them roughly in order.

---

## 1. Database — Cloudflare D1 (already set up)

The D1 database `demoify` is created and bound as `DB` in `wrangler.jsonc`, and the schema
migration (`migrations/0001_init.sql`) is applied to both local and remote. Nothing to do for a
normal deploy. Reference for future schema changes:

- **Edit schema** → `prisma/schema.prisma`, then `npx prisma generate`.
- **Create migration SQL:**
  ```
  npx wrangler d1 migrations create demoify <name>
  npx prisma migrate diff --from-local-d1 --to-schema prisma/schema.prisma --script > migrations/<file>.sql
  ```
- **Apply:** `npx wrangler d1 migrations apply demoify --local` (dev) and `--remote` (prod, also
  done automatically by CI).

Local dev uses an emulated D1 (in `.wrangler/`), so it's fully **offline** — no external DB.

## 2. Domain — demoify.app

`.app` is a Google-run, HSTS-preloaded TLD — **HTTPS only** (no plain HTTP), which Workers
satisfy by default.

- **If registered at Cloudflare Registrar:** the zone is already in your Cloudflare account —
  nothing to delegate. Skip to step 3.
- **If registered elsewhere:** add the domain to Cloudflare (**Add site → Full setup**) and set
  the registrar's nameservers to the two Cloudflare gives you. Wait for "Active".

3. Bind the Worker to the domain: uncomment the `routes` block in `wrangler.jsonc`, then deploy.
   (The custom-domain route auto-creates the DNS record + cert.) Do this only after the first
   successful deploy has created the Worker.

## 3. R2 (already created — `demoify` bucket)

1. Attach a public custom domain to the bucket: R2 → `demoify` → **Settings → Public access →
   Custom domain** → `cdn.demoify.app` (Cloudflare adds the DNS record).
2. CORS already includes `https://demoify.app` in `r2-cors.json`. Re-apply it:
   ```
   npx wrangler r2 bucket cors set demoify --file r2-cors.json
   ```
3. Set `R2_PUBLIC_URL` secret to `https://cdn.demoify.app` (step 6).

## 4. Email — Resend

1. Create an account at <https://resend.com>, add domain `demoify.app`, and add the SPF/DKIM
   DNS records it gives you to Cloudflare DNS. Wait for verification.
2. Create an API key → that's `RESEND_API_KEY` (step 6).
3. `EMAIL_FROM` defaults to `Demoify <noreply@demoify.app>` — override via secret if desired.

## 5. Stripe (live)

1. Switch to live mode, copy the live `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint → `https://demoify.app/api/credits/webhook`, events
   `checkout.session.completed` **and** `account.updated`. Copy the signing
   secret → `STRIPE_WEBHOOK_SECRET`.
3. **Tipping (artist payouts):** enable **Connect → Express** in the Stripe
   dashboard and set your platform branding. The `account.updated` event above is
   what flips an artist to "payouts enabled". Full design + setup + test steps:
   [`docs/tipping.md`](docs/tipping.md). No extra secrets — tips reuse
   `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`.

## 6. Worker secrets

Set each as a Worker secret (one prompt per command), or in the dashboard
(Workers → demoify → Settings → Variables):

```
npx wrangler secret put BETTER_AUTH_SECRET      # openssl rand -hex 32
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET               # demoify
npx wrangler secret put R2_PUBLIC_URL           # https://cdn.demoify.app
npx wrangler secret put RESEND_API_KEY
# Optional social login:
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

`BETTER_AUTH_URL` is a plain var in `wrangler.jsonc` (not a secret). The database needs no
secret — D1 is a binding.

### Optional vars — credits & federation

- `CREDITS_ENABLED` — leave unset/`"true"` for demoify.app (credits on). A self-hosted
  fork that wants free uploads sets it to `"false"` (a plain var in `wrangler.jsonc` is fine).
- **Run demoify.app as a federation hub** so self-hosted instances appear in Explore: set
  `FEDERATION_HUB_ENABLED="true"` (plain var). Register each instance and mint its token with
  `just federation …` locally, or insert into D1 via `wrangler d1 execute` (see
  [`docs/federation.md`](docs/federation.md)). No shared secret is stored in config — each
  instance's token hash lives in the `federated_instance` table.

## 7. First deploy

Locally:
```
npm run deploy        # opennextjs-cloudflare build && deploy
```
Or push to `main` and let GitHub Actions do it (see below).

### GitHub Actions secrets (for CI in `.github/workflows/deploy.yml`)
- `CLOUDFLARE_API_TOKEN` — use the **"Edit Cloudflare Workers"** token template (also needs D1
  edit permission for the migrations step).
- `CLOUDFLARE_ACCOUNT_ID` — **already set** (equals your R2 account id).

The CI workflow skips (stays green) until both are present, then migrates D1 + deploys.

---

## Local preview before shipping

```
npm run preview       # runs the real Workers runtime locally via OpenNext
```
Both `npm run dev` and `npm run preview` use the **local emulated D1** (no setup, offline). If
you change the schema, re-run `npx wrangler d1 migrations apply demoify --local` first.

## Verification checklist
- [ ] `npm run preview` boots; sign-up works. *(signup → D1 already verified via `wrangler dev`)*
- [ ] D1 migration applied remotely (`wrangler d1 migrations apply demoify --remote`). *(done)*
- [ ] Sign up on demoify.app → verification email arrives → verify → log in.
- [ ] Password reset email arrives and completes.
- [ ] Upload an MP3 → plays back from `cdn.demoify.app`.
- [ ] Stripe checkout → credits increment (webhook 200).
- [ ] Stripe Connect enabled; artist `/dashboard/payouts` onboarding → `account.updated` flips payouts on; test tip splits 90/10 (see `docs/tipping.md`).
- [ ] Push to `main` → Actions deploys cleanly.
