# Credits & Payments

## Context

Uploading audio costs us money (R2 storage + bandwidth). To keep that sustainable
while staying friendly to new musicians, Demoify uses a **credit** system:

- A user's first artist profile (band) starts with enough credits to upload
  **10 tracks for free**.
- After that, a band **earns** more credits by engaging with other bands' songs,
  or **buys** more via Stripe Checkout.
- Tracks are intentionally cheap to upload — pricing is set so a track costs cents.

**Credits belong to the band, not the user.** A user joins one or more bands via
`BandMembership`, and every credit-affecting action — uploading, buying, earning,
redeeming a coupon, an admin gift — resolves "the user's *currently active* band"
(`getActiveBand()`, `src/lib/band.ts`) and debits/credits **that band's** balance.
This matters: a user who owns multiple bands has a separate balance per band, and
switching the active band (the header dropdown) switches which balance is in
play. It was also the root cause of a real bug — see [Coupons](#coupons) below.

This doc describes the design as built.

## Economics

| Thing | Value | Where |
| --- | --- | --- |
| Starting balance (first band) | **100 credits** | `STARTING_CREDITS` + `Band.credits @default(100)` |
| Starting balance (additional bands) | **10 credits** (one upload's worth) | `NEW_ARTIST_CREDITS` |
| Cost per upload | **10 credits** | `UPLOAD_COST` |
| Free uploads for a new band | **10** (100 ÷ 10) | — |
| Base price | **100 credits = $1.00** (1 credit = 1¢) | `CREDITS_PER_USD` |

All constants live in `src/lib/credits.ts`. Changing `UPLOAD_COST` or
`STARTING_CREDITS` immediately changes behaviour everywhere (UI copy, gating, charge).

A user's **first** band gets the full `STARTING_CREDITS`; creating an
**additional** band (they can run several artist profiles from one account) is
free but only starts with `NEW_ARTIST_CREDITS` (one upload's worth) — see the
`createArtistProfile` action (`src/app/actions/bands.ts`).

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

### Earning credits (engagement rewards)

Listeners and other bands can earn credits for free by engaging with **someone
else's** songs — this keeps active community members supplied with uploads
without paying:

| Action | Reward | Constant |
| --- | --- | --- |
| Like a song | +1 credit | `ENGAGEMENT_CREDITS.like` |
| Comment on a song | +2 credits | `ENGAGEMENT_CREDITS.comment` |
| Play a song (full play) | +3 credits | `ENGAGEMENT_CREDITS.play` |

Granted by `grantEngagementCredits` (`src/lib/engagement.ts`), called from the
like/comment/play server actions (`src/app/actions/likes.ts`,
`src/app/actions/comments.ts`, `src/app/actions/plays.ts`):

- **No self-farming** — engaging with a song from a band you're a member of
  pays out nothing (`getMembership` + `isMember` check before granting).
- **Credits land in the engager's active band**, not the band whose song they
  engaged with.
- **At most once per (user, reason, song)** — capped by `CreditTransaction`'s
  `@@unique([userId, reason, refId])` constraint (`refId` is the song's
  `projectId`). Re-liking, re-commenting, or replaying the same song never pays
  out twice. A duplicate-grant attempt hits Prisma's `P2002` and is treated as a
  0-credit no-op, not an error.

## Data model

`prisma/schema.prisma`:

- `Band.credits Int @default(100)` — the balance (source of truth). **Not**
  `User.credits` — see [Context](#context).
- `CreditTransaction` — append-only ledger for history + webhook idempotency:
  - `delta Int` (positive = added, negative = spent)
  - `reason String` — `"upload"` | `"purchase"` | `"like"` | `"comment"` |
    `"play"` | `"coupon"` | `"gift"`
  - `stripeSessionId String? @unique` — makes purchase fulfilment idempotent.
  - `userId String?` / `refId String?` — who triggered it and what it refers to
    (a song for engagement rewards, a coupon id for coupon redemptions). Null
    for upload/purchase rows. Backs the `@@unique([userId, reason, refId])`
    once-per-action cap described above.
  - `note String?` — free-text note on a `"gift"` row (an admin's reason for
    gifting credits, see [`docs/admin.md`](./admin.md)); null for every other
    reason.

## Spending credits (upload flow)

1. **Early gate** — `POST /api/upload/presign` (`src/app/api/upload/presign/route.ts`)
   checks the band's balance before issuing a presigned R2 URL. If
   `credits < UPLOAD_COST` it returns **HTTP 402** with `code:
   "INSUFFICIENT_CREDITS"`, so a band that can't pay never wastes an upload.
2. **Atomic charge** — `createVersion` (`src/app/actions/versions.ts`) does the real
   debit inside one transaction:
   ```
   updateMany(where: { id, credits: { gte: UPLOAD_COST } },
              data:  { credits: { decrement: UPLOAD_COST } })
   ```
   If `count === 0` the balance was too low → throw → version is **not** created and
   nothing is charged. On success it also writes the `SongVersion`, a
   `CreditTransaction(delta: -10, reason: "upload")`, all in the same transaction.

   The conditional decrement prevents going negative and prevents double-spend under
   concurrency; the existing `(projectId, versionNumber)` unique constraint still
   guards version numbering.

### Upload UI

`src/components/upload-version.tsx` and `src/components/create-song-form.tsx`
receive the band's live `credits` prop and show the cost directly on the submit
button (e.g. "Upload version · 10 credits") so the cost is visible before
clicking, not just in a separate balance note:
- `credits < UPLOAD_COST` → shows balance + a **Buy more credits** link, no form.
- otherwise → shows the form with the cost on the button and "you have N" nearby.

## Buying credits (payment flow)

Provider: **Stripe Checkout** (hosted). Gated by env, exactly like R2/social — if
keys are absent, payments are disabled and the buy-credits page shows a "coming
soon" message instead of a broken checkout (the package cards still render, so
the page doesn't look unfinished — clicking Buy just opens a dialog instead of
hitting Stripe).

1. User opens **`/dashboard/credits`** (`src/app/dashboard/credits/page.tsx`) — shows
   balance, uploads remaining, a "how credits work" explainer, and the packages
   (`src/components/buy-credits.tsx`).
2. **Create session** — `POST /api/credits/checkout` creates a Stripe Checkout
   session (`mode: "payment"`) with `metadata { bandId, packageId, credits }` and
   returns its URL; the browser is redirected to Stripe. (If a discount coupon is
   applied, metadata also carries `couponId` + `userId` — see [Coupons](#coupons).)
3. **Fulfilment** — Stripe calls `POST /api/credits/webhook`:
   - verifies the signature with `STRIPE_WEBHOOK_SECRET`,
   - on `checkout.session.completed` + `payment_status === "paid"`, in one
     transaction creates `CreditTransaction(delta: +credits, reason: "purchase",
     stripeSessionId)` and increments `Band.credits`.
   - **Idempotent**: a replayed event hits the unique `stripeSessionId` (Prisma
     `P2002`) and is treated as a no-op.
4. User returns to `/dashboard/credits?purchase=success`; the page toasts and refreshes.

Fulfilment is driven entirely by the webhook (not the success redirect), so credits
are granted even if the user closes the tab before returning.

## Coupons

Admin-issued codes that either grant free credits directly or discount a
purchase. Created and managed at `/admin/coupons` — see
[`docs/admin.md`](./admin.md) for the operator-facing side. This section covers
how a regular user redeems one.

There are two kinds, both defined on the `Coupon` model (`prisma/schema.prisma`):
`FREE_CREDITS` (amount = credits granted) and `PERCENT_OFF` / `FIXED_OFF`
(amount = percent or cents off a purchase).

### Redeeming (user-facing)

A single "Have a code?" input lives at the top of `src/components/buy-credits.tsx`
(`/dashboard/credits`). Submitting it calls `applyCoupon` (`src/app/actions/coupons.ts`),
which looks up the code's kind and dispatches:

- **`FREE_CREDITS`** → `redeemCoupon` grants the credits immediately (no Stripe
  involved): one transaction creates a `CouponRedemption` row, a real
  `CreditTransaction(reason: "coupon", delta: +amount)`, increments `Band.credits`,
  and increments the coupon's `redemptionCount`.
- **`PERCENT_OFF` / `FIXED_OFF`** → `validateCoupon` only *previews* the discount
  (no DB writes — nothing has been paid for yet) and the client holds onto it
  client-side until the user clicks **Buy** on a package. `POST
  /api/credits/checkout` re-validates the code server-side (never trusts the
  earlier preview) and computes the discounted `unit_amount`. The actual
  `CouponRedemption` row for a discount is only ever written by the **webhook**,
  once Stripe confirms payment — so an abandoned checkout leaves the coupon
  unused.

### Redemption caps — per band *and* per user

`CouponRedemption` has **two** unique constraints: `(couponId, bandId)` and
`(couponId, userId)`. Both exist for a reason:

- `(couponId, bandId)` alone stops two co-admins of the *same* band from each
  separately redeeming the same code for double credits.
- `(couponId, userId)` closes a real exploit found and fixed in this codebase: a
  single user can own several bands and switch their active band via the header
  dropdown (trivial, free, instant) — with only the band-level constraint, they
  could redeem the same code once per band they control. The per-user constraint
  caps redemption to once **per person**, regardless of which band they're acting
  as at the time.

For the `FREE_CREDITS` path the redeemer's `userId` is on hand directly (a real
user session). For discount kinds the redemption is recorded by the Stripe
webhook, which has no session — so `/api/credits/checkout` passes the
purchaser's `userId` through Checkout Session metadata specifically so the
webhook can populate it on the `CouponRedemption` row too.

Coupons are **soft-deleted only** (`Coupon.active`, toggled from `/admin/coupons`)
— `CouponRedemption.couponId` has `onDelete: Restrict`, so a coupon can never be
hard-deleted while redemption history references it. There's no delete action in
the admin UI at all; disabling is the only lifecycle action.

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

- `src/lib/credits.ts` — constants, packages, engagement rewards, helpers (`formatUsd`, `uploadsRemaining`).
- `src/lib/engagement.ts` — `grantEngagementCredits` (idempotent engagement payouts).
- `src/lib/stripe.ts` — gated Stripe client + `isStripeConfigured()`.
- `prisma/schema.prisma` — `Band.credits`, `CreditTransaction`, `Coupon`, `CouponRedemption`.
- `src/app/actions/versions.ts` — atomic spend on upload.
- `src/app/actions/coupons.ts` — `redeemCoupon`, `validateCoupon`, `applyCoupon`, plus admin `createCoupon`/`setCouponActive` (see `docs/admin.md`).
- `src/app/api/upload/presign/route.ts` — early 402 balance gate.
- `src/app/api/credits/checkout/route.ts` — Checkout session, coupon discount calculation.
- `src/app/api/credits/webhook/route.ts` — idempotent fulfilment, coupon redemption recording.
- `src/app/dashboard/credits/page.tsx` + `src/components/buy-credits.tsx` — buy/redeem UI.
- `src/components/upload-version.tsx`, `src/components/create-song-form.tsx` — upload cost UI.
- `src/components/site-header.tsx` (desktop balance pill), `src/components/mobile-nav.tsx`
  (mobile menu row) — both link to `/dashboard/credits`.

## Verification

Spending (verified):
- New band's first artist profile → balance `100`; an additional band → balance `10`.
- Balance `5` → upload UI shows "Buy more credits"; presign returns **402**
  `INSUFFICIENT_CREDITS`.
- Balance `≥10` → upload form renders with cost on the button; presign returns
  **200** and signs the URL.

Engagement (verified):
- Liking/commenting/playing another band's song grants the right amount to your
  active band; repeating the same action on the same song grants nothing extra.
- Engaging with your own band's song grants nothing.

Coupons (verified against the database directly):
- Redeeming a `FREE_CREDITS` code increments the balance and writes one
  `CreditTransaction` + one `CouponRedemption`; redeeming again is rejected.
- The exploit scenario — same user, switch active band, redeem again — is
  rejected by the `(couponId, userId)` constraint.
- A coupon with redemptions can't be hard-deleted (`Restrict` FK); disabling
  (`active = false`) works and blocks further redemption.

Payments (gated; not exercised without keys):
- No keys → `/api/credits/checkout` returns **503**; buy page shows the
  "coming soon" dialog instead of a broken checkout.
- With keys → buy a package, complete Stripe test checkout, confirm webhook adds
  credits and the ledger row appears; re-send the webhook event and confirm the
  balance does **not** change (idempotency).

## Future work

- Sales/promo pricing (already supported by per-package `priceCents`; needs UI).
- Refunds → negative `CreditTransaction` on `charge.refunded`.
- Surface the `CreditTransaction` ledger as a user-visible history page.
- Coupon analytics beyond the raw `redemptionCount` (e.g. revenue impact of
  discount codes).
