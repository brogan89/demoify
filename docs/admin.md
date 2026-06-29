# Admin

## Context

A few operator-only tools live at `/admin` — issuing promo/free-credit codes and
directly gifting credits to a band (to compensate a bug report, reward good
feedback, or top up your own account when testing). There's no general
platform-admin system here, just enough to support those two tasks.

This doc covers the admin tooling itself. For the credit economy it operates on
— how balances work, how coupons are redeemed by users — see
[`docs/credits-and-payments.md`](./credits-and-payments.md).

## Access control

`/admin` is gated by `isCurrentUserAdmin()` (`src/lib/admin.ts`), which checks the
signed-in user's email against the comma-separated `ADMIN_EMAILS` env var
(case-insensitive). There's no `isAdmin` column or role anywhere in the schema —
this is intentionally the simplest possible gate, matching this codebase's style
for other optional features (`isStripeConfigured()`, `isR2Configured()`).

- **Not in any nav** — `/admin` is reached by typing the URL, not a link in
  `site-header.tsx` or `mobile-nav.tsx`. This avoids an extra admin-check on every
  page load for a feature almost nobody will use.
- **Non-admins are bounced silently** — every admin page `redirect("/dashboard")`
  for a non-admin rather than showing an "unauthorized" message, the same pattern
  used elsewhere for feature-flagged-off pages.
- **Every admin server action re-checks independently** — `createCoupon`,
  `setCouponActive`, and `giftCredits` each call `isCurrentUserAdmin()`
  themselves rather than trusting that the caller already passed the page-level
  gate, since actions are independently invocable.
- Set `ADMIN_EMAILS=""` (unset) to disable the whole section for everyone — the
  default.

```
ADMIN_EMAILS="you@example.com"            # single admin
ADMIN_EMAILS="you@example.com,ops@x.com"  # multiple, comma-separated
```

## `/admin` — index

`src/app/admin/page.tsx`. A small landing page linking to each admin section
below. New sections should be added here as a list item, not surfaced anywhere
else.

## `/admin/coupons` — coupon administration

`src/app/admin/coupons/page.tsx` + `src/components/manage-coupons.tsx`. Create
form on top, list of existing coupons below (code, kind, amount, redemption
count vs. limit, expiry, active toggle).

Backed by `src/app/actions/coupons.ts`:

- **`createCoupon({ code?, kind, amount, maxRedemptions?, expiresAt? })`** — `code`
  is optional; if blank, an 8-character code is auto-generated from an
  unambiguous alphabet (no `0`/`O`, `1`/`I`/`L`). `kind` is one of
  `FREE_CREDITS` | `PERCENT_OFF` | `FIXED_OFF`; `amount` means credits, whole
  percent (capped at 100), or cents respectively. Duplicate codes are rejected
  (`Coupon.code` is unique).
- **`setCouponActive(couponId, active)`** — the *only* lifecycle action. There is
  **no delete** — `CouponRedemption.couponId` has `onDelete: Restrict`, so a
  coupon can never be removed while redemption history references it, and the UI
  doesn't offer a hard-delete that would just fail. Disabling stops further
  redemption without losing the audit trail.

See [`docs/credits-and-payments.md#coupons`](./credits-and-payments.md#coupons)
for how a coupon is actually redeemed, and for why redemption is capped both per
band and per user.

## `/admin/credits` — gift credits

`src/app/admin/credits/page.tsx` + `src/components/gift-credits.tsx`. A form to
directly credit a band's balance, plus a history of the last 50 gifts (band,
amount, note, date) for your own record-keeping.

Backed by **`giftCredits({ target, amount, note? })`** (`src/app/actions/admin.ts`).
Unlike coupons, this is a direct grant — no code, no redemption cap, can be
repeated as many times as you want for the same band.

`target` can be **either**:
- a **band username** (e.g. `dolphin-drive`) — matched directly, normalized the
  same way as any other username lookup in the app; or
- a **user's email** — resolved to their bands via `BandMembership`. If they
  belong to exactly one band, that band is credited. If they belong to **zero**
  bands (a listener with no artist profile) or **two or more**, the action
  refuses and asks for the band's username instead, rather than guessing which
  one to credit.

`note` is optional free text (e.g. "reported the upload bug on March 3rd"),
stored on the `CreditTransaction` row (`note` column) and shown in the gift
history — purely for your own memory of why a gift was given, not shown to the
recipient anywhere.

Every gift writes one `CreditTransaction(reason: "gift", delta: +amount, note)`
and increments `Band.credits` in a single transaction — no separate
"redemption" table, since there's nothing to cap or dedupe (you can gift the
same band as many times as you like).

## Configuration

```
ADMIN_EMAILS=""   # comma-separated; unset disables /admin for everyone
```

No other setup — no new Stripe/email/storage dependency. If you want `/admin`
usable on a deployed instance, set `ADMIN_EMAILS` as a plain Worker var
(`wrangler.jsonc`'s `vars`, or `npx wrangler secret put ADMIN_EMAILS` if you'd
rather keep it out of the repo) — see [`DEPLOYMENT.md`](../DEPLOYMENT.md).

## Key files

- `src/lib/admin.ts` — `isAdminEmail`, `isCurrentUserAdmin`.
- `src/app/admin/page.tsx`, `src/app/admin/coupons/page.tsx`, `src/app/admin/credits/page.tsx`.
- `src/components/manage-coupons.tsx`, `src/components/gift-credits.tsx`.
- `src/app/actions/coupons.ts` — `createCoupon`, `setCouponActive` (admin-only;
  also `redeemCoupon`/`validateCoupon`/`applyCoupon` for the user-facing side).
- `src/app/actions/admin.ts` — `giftCredits` and its band/email resolution logic.
- `prisma/schema.prisma` — `Coupon`, `CouponRedemption`, `CreditTransaction.note`.
- `migrations/0011_coupons.sql`, `0012_credit_transaction_note.sql`,
  `0013_coupon_redemption_per_user.sql`.

## Verification

- Non-admin (or logged-out) visiting `/admin`, `/admin/coupons`, or
  `/admin/credits` is redirected to `/dashboard`, not shown an error.
- An admin sees both sections from the `/admin` index and can create/disable
  coupons and gift credits.
- Gifting by band username vs. by a single-band user's email both resolve to the
  same band and produce identical `CreditTransaction`/`Band.credits` results.
- Gifting via an email with zero bands or multiple bands is rejected with a
  clear error instead of guessing.

## Future work

- More admin sections will likely land here over time (this namespace was set up
  specifically to have room to grow) — add new ones as additional cards on the
  `/admin` index and a new entry in this doc.
- A real audit log beyond the gift-credits history (e.g. who disabled which
  coupon, when).
- Multiple admins currently all share equal access via the same `ADMIN_EMAILS`
  list — no per-admin permissions or activity attribution beyond what's already
  in `CreditTransaction.userId`/`note`.
