# Credits & Payments

## Context

Uploading audio costs us money (R2 storage + bandwidth). To keep that sustainable
while staying friendly to new musicians, Demoify uses a **credit** system:

- Every new account starts with enough credits to upload **3 tracks for free**.
- After that, users **buy more credits** to keep uploading.
- Tracks are intentionally cheap to upload — pricing is set so a track costs cents.

This doc describes the design as built.

## Economics

| Thing | Value | Where |
| --- | --- | --- |
| Starting balance | **150 credits** | `STARTING_CREDITS` + `User.credits @default(150)` |
| Cost per upload | **50 credits** | `UPLOAD_COST` |
| Free uploads for a new user | **3** (150 ÷ 50) | — |
| Base price | **100 credits = $1.00** (1 credit = 1¢) | `CREDITS_PER_USD` |

All constants live in `src/lib/credits.ts`. Changing `UPLOAD_COST` or
`STARTING_CREDITS` immediately changes behaviour everywhere (UI copy, gating, charge).

### Packages

Sold via Stripe Checkout. Defined in `CREDIT_PACKAGES` (`src/lib/credits.ts`):

| Package | Credits | Price |
| --- | --- | --- |
| Starter | 150 | $1.50 |
| Creator | 500 | $5.00 |
| Studio | 1500 | $15.00 |

`priceCents` is stored **explicitly per package** so a future sale can lower the
price (or add bonus credits) without touching the base ratio — e.g. a promo could
set Studio to `priceCents: 1000` for 1500 credits.

## Data model

`prisma/schema.prisma`:

- `User.credits Int @default(150)` — the balance (source of truth).
- `CreditTransaction` — append-only ledger for history + webhook idempotency:
  - `delta Int` (positive = added, negative = spent)
  - `reason String` (`"upload"` | `"purchase"`)
  - `stripeSessionId String? @unique` — makes purchase fulfilment idempotent.

The balance is also exposed on the Better Auth session as an `additionalField`
(`input: false`, server-managed) so the header can show it without an extra query.

## Spending credits (upload flow)

1. **Early gate** — `POST /api/upload/presign` (`src/app/api/upload/presign/route.ts`)
   checks the balance before issuing a presigned R2 URL. If `credits < UPLOAD_COST`
   it returns **HTTP 402** with `code: "INSUFFICIENT_CREDITS"`, so a user who can't
   pay never wastes an upload.
2. **Atomic charge** — `createVersion` (`src/app/actions/versions.ts`) does the real
   debit inside one transaction:
   ```
   updateMany(where: { id, credits: { gte: UPLOAD_COST } },
              data:  { credits: { decrement: UPLOAD_COST } })
   ```
   If `count === 0` the balance was too low → throw → version is **not** created and
   nothing is charged. On success it also writes the `SongVersion`, a
   `CreditTransaction(delta: -50, reason: "upload")`, all in the same transaction.

   The conditional decrement prevents going negative and prevents double-spend under
   concurrency; the existing `(projectId, versionNumber)` unique constraint still
   guards version numbering.

### Upload UI

`src/components/upload-version.tsx` receives the live `credits` prop:
- `credits < UPLOAD_COST` → shows balance + a **Buy more credits** link, no form.
- otherwise → shows the form with "Costs 50 credits · you have N".

## Buying credits (payment flow)

Provider: **Stripe Checkout** (hosted). Gated by env, exactly like R2/social — if
keys are absent, payments are disabled and the UI says so.

1. User opens **`/dashboard/credits`** (`src/app/dashboard/credits/page.tsx`) — shows
   balance, uploads remaining, and the packages (`src/components/buy-credits.tsx`).
2. **Create session** — `POST /api/credits/checkout` creates a Stripe Checkout
   session (`mode: "payment"`) with `metadata { userId, packageId, credits }` and
   returns its URL; the browser is redirected to Stripe.
3. **Fulfilment** — Stripe calls `POST /api/credits/webhook`:
   - verifies the signature with `STRIPE_WEBHOOK_SECRET`,
   - on `checkout.session.completed` + `payment_status === "paid"`, in one
     transaction creates `CreditTransaction(delta: +credits, reason: "purchase",
     stripeSessionId)` and increments `User.credits`.
   - **Idempotent**: a replayed event hits the unique `stripeSessionId` (Prisma
     `P2002`) and is treated as a no-op.
4. User returns to `/dashboard/credits?purchase=success`; the page toasts and refreshes.

Fulfilment is driven entirely by the webhook (not the success redirect), so credits
are granted even if the user closes the tab before returning.

## Configuration

Add to `.env` (see `.env.example`). Buttons/flows stay disabled until set.

```
STRIPE_SECRET_KEY=""        # Stripe secret key
STRIPE_WEBHOOK_SECRET=""    # Signing secret for the webhook endpoint
```

- Webhook endpoint: `<BETTER_AUTH_URL>/api/credits/webhook`, event
  `checkout.session.completed`.
- Local testing: `stripe listen --forward-to localhost:3000/api/credits/webhook`
  (the CLI prints the `whsec_…` to use as `STRIPE_WEBHOOK_SECRET`).
- `isStripeConfigured()` (`src/lib/stripe.ts`) is the single gate.

## Key files

- `src/lib/credits.ts` — constants, packages, helpers (`formatUsd`, `uploadsRemaining`).
- `src/lib/stripe.ts` — gated Stripe client + `isStripeConfigured()`.
- `prisma/schema.prisma` — `User.credits`, `CreditTransaction`.
- `src/app/actions/versions.ts` — atomic spend on upload.
- `src/app/api/upload/presign/route.ts` — early 402 balance gate.
- `src/app/api/credits/checkout/route.ts` — Checkout session.
- `src/app/api/credits/webhook/route.ts` — idempotent fulfilment.
- `src/app/dashboard/credits/page.tsx` + `src/components/buy-credits.tsx` — buy UI.
- `src/components/upload-version.tsx`, `src/components/site-header.tsx` — balance UI.

## Verification

Spending (verified):
- New signup → balance `150`.
- Balance `40` → upload UI shows "Buy more credits"; presign returns **402**
  `INSUFFICIENT_CREDITS`.
- Balance `150` → upload form renders; presign returns **200** and signs the URL.

Payments (gated; not exercised without keys):
- No keys → `/api/credits/checkout` returns **503**; buy page shows "payments not
  configured".
- With keys → buy a package, complete Stripe test checkout, confirm webhook adds
  credits and the ledger row appears; re-send the webhook event and confirm the
  balance does **not** change (idempotency).

## Future work

- Sales/promo pricing (already supported by per-package `priceCents`; needs UI).
- Refunds → negative `CreditTransaction` on `charge.refunded`.
- Surface the `CreditTransaction` ledger as a user-visible history page.
