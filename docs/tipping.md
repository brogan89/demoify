# Tipping (artist payouts)

## Context

Listeners can send an artist a **real-money tip** from a song page or an artist
profile. Tips are split **90% to the artist, 10% to the platform (developer)**.

Unlike credits (which are an in-app currency, see `credits-and-payments.md`),
tips move real money to the artist's own bank account. This is done with
**Stripe Connect** (Express accounts) and *destination charges*: Stripe performs
the split automatically — 90% transfers to the artist's connected account, 10%
is taken as the platform `application_fee_amount`. Our code never holds or moves
the money; it only records a receipt.

This doc describes the design as built **and the one-time Stripe setup required
to turn it on** (see [Setup checklist](#setup-checklist) — nothing below works
until those steps are done).

## Economics

| Thing | Value | Where |
| --- | --- | --- |
| Artist share | **90%** | `100 - PLATFORM_FEE_PERCENT` |
| Platform fee | **10%** | `PLATFORM_FEE_PERCENT` (`src/lib/tips.ts`) |
| Preset amounts | **$2 / $5 / $10** | `TIP_PRESETS_CENTS` |
| Min / max tip | **$1 / $500** | `MIN_TIP_CENTS` / `MAX_TIP_CENTS` |

All constants live in `src/lib/tips.ts`. `splitTip(amountCents)` returns
`{ feeCents, artistCents }` (fee = `round(amount * 10%)`, artist = remainder).

## Data model

`prisma/schema.prisma` + migration `migrations/0008_tips.sql`:

- `Band.stripeAccountId String?` — the artist's connected Express account id
  (null until they set up payouts).
- `Band.payoutsEnabled Boolean @default(false)` — cached
  `charges_enabled && payouts_enabled`, refreshed by the `account.updated`
  webhook so we don't call Stripe on every page render. The tip button only
  shows when this is `true`.
- `Tip` — append-only record (receipt + history + webhook idempotency):
  - `bandId` (recipient), `tipperUserId?`, `projectId?`
  - `amountCents`, `feeCents`, `artistCents`, `currency`
  - `status` (`"pending"` | `"paid"`)
  - `stripeSessionId String? @unique` — makes fulfilment idempotent.

Balances are **not** mutated on a tip — Stripe moves the funds via the
destination charge; the `Tip` row is just the record.

## Artist onboarding (Stripe Connect)

1. An artist opens **`/dashboard/payouts`**
   (`src/app/dashboard/payouts/page.tsx`, linked from `/dashboard/band`).
2. "Set up payouts" → `POST /api/connect/onboard`:
   - creates a Stripe **Express** account on first use and stores its id on the
     band (`Band.stripeAccountId`),
   - creates a hosted onboarding **Account Link** and returns its URL; the
     browser is redirected to Stripe.
3. The artist completes Stripe's hosted onboarding and is returned to
   `/dashboard/payouts?return=1`.
4. Stripe sends **`account.updated`** to the webhook; we flip
   `Band.payoutsEnabled` based on `charges_enabled && payouts_enabled`. Once
   `true`, the band can receive tips.

## Tipping flow (payment)

1. A signed-in listener clicks **Tip** on a song or artist page
   (`src/components/tip-button.tsx`) and picks a preset or custom amount. The
   dialog discloses the 90/10 split and thanks them.
   - The button only renders when the artist has `payoutsEnabled` **and** the
     viewer is not a member of that band (no tipping your own artist).
   - Not signed in → redirected to `/login`.
2. **Create session** — `POST /api/tips/checkout`:
   - validates the amount (`isValidTipAmount`) and that the recipient has
     payouts enabled, blocks self-tips,
   - creates a Stripe Checkout session (`mode: "payment"`) with
     `payment_intent_data.application_fee_amount` (10%) and
     `transfer_data.destination` (artist's account),
   - metadata `{ kind: "tip", bandId, tipperUserId, projectId, amountCents,
     feeCents, artistCents }`; returns the URL → browser redirected to Stripe.
3. **Fulfilment** — Stripe calls `POST /api/credits/webhook` (the existing
   webhook, extended to also handle tips):
   - on `checkout.session.completed` + `payment_status === "paid"` + metadata
     `kind === "tip"`, creates a `Tip(status: "paid")`,
   - **idempotent**: a replay hits the unique `stripeSessionId` (Prisma `P2002`)
     and is a no-op,
   - the money split already happened inside Stripe (destination charge).
4. The listener returns to the song/artist page with `?tip=success`, which
   toasts a thank-you (`src/components/tip-result-toast.tsx`).

> The credits webhook and tip handling share one endpoint. A credits purchase
> has `credits > 0` and no `kind`; a tip has `kind: "tip"` and no `credits`, so
> the two branches never overlap.

## Configuration

Reuses the **same** env vars as credits — no new secrets:

```
STRIPE_SECRET_KEY=""        # Stripe secret key
STRIPE_WEBHOOK_SECRET=""    # Signing secret for the webhook endpoint
```

`isStripeConfigured()` (`src/lib/stripe.ts`) gates everything; with no keys the
payout/tip APIs return **503** and the payouts UI says payments aren't configured.

## Setup checklist

Do these once to turn tipping on (the feature is fully built but inert until then):

1. **Enable Stripe Connect** in the Stripe dashboard → *Connect* → enable
   **Express** accounts. Set your platform business profile/branding (shown on the
   artist onboarding screens).
2. **Add the `account.updated` event** to your existing webhook endpoint
   (`<BETTER_AUTH_URL>/api/credits/webhook`). It should now be subscribed to:
   - `checkout.session.completed` (already there for credits)
   - `account.updated` (new — needed to flip `payoutsEnabled`)
   No new endpoint or signing secret is required.
3. **Apply the migration to the remote D1 database:**
   ```
   npx wrangler d1 migrations apply demoify --remote
   ```
   (Already applied to the local DB during development.)
4. **Deploy** the app.

### Cross-border note
Destination charges require the connected account to be supported by your
platform's Stripe region. If your artists are in different countries than your
platform account, enable **cross-border payouts** in the Connect settings (or
the transfer will be rejected).

## Verification (Stripe test mode)

1. **Onboarding** — as an artist, `/dashboard/payouts` → "Set up payouts" →
   complete Stripe Express test onboarding → return. Confirm `account.updated`
   flips `Band.payoutsEnabled = true` (check the DB) and the page shows "Tips are
   active".
2. **Tip** — as a *different* signed-in user, open that artist's song → **Tip** →
   pick $5 (or custom) → pay with test card `4242 4242 4242 4242`. Confirm:
   - redirect back with the `?tip=success` toast,
   - in the Stripe dashboard: a payment with a 10% `application_fee_amount` and a
     transfer to the connected account,
   - a `Tip` row with `status: "paid"` and correct `feeCents` / `artistCents`.
3. **Guards** — tip button hidden on your own band's songs and for artists
   without payouts; checkout rejects amounts below $1 / above $500; re-sending the
   webhook event creates **no** duplicate `Tip` (idempotency).
4. **No regression** — buy credits and confirm the shared webhook still grants
   credits.

## Key files

- `src/lib/tips.ts` — split math, presets, bounds.
- `src/lib/stripe.ts` — gated Stripe client + `isStripeConfigured()`.
- `prisma/schema.prisma` + `migrations/0008_tips.sql` — `Band.stripeAccountId`,
  `Band.payoutsEnabled`, `Tip`.
- `src/app/api/connect/onboard/route.ts` — Express account + onboarding link.
- `src/app/api/tips/checkout/route.ts` — destination-charge Checkout session.
- `src/app/api/credits/webhook/route.ts` — records tips + handles `account.updated`.
- `src/app/dashboard/payouts/page.tsx` + `src/components/connect-payouts.tsx` — payout setup UI.
- `src/components/tip-button.tsx`, `src/components/tip-result-toast.tsx` — tip UI.
- `src/components/ui/dialog.tsx` — dialog primitive used by the tip dialog.
- Surfaced on `src/app/[username]/[slug]/page.tsx`, `src/app/[username]/page.tsx`,
  and `src/app/page.tsx` (homepage section).

## Future work

- Artist-facing tip history / earnings view (the `Tip` table already records them).
- Refund/dispute handling beyond Stripe's automatic reversal of the transfer + fee.
- Optional anonymous (logged-out) tipping — currently login is required so tips
  are attributable.
- Configurable / promotional fee percentage.
