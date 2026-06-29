# Changelog & decision log

> Chronological record of feature plans and the decisions behind them, kept so
> the reasoning isn't lost once a conversation ends or a planning doc gets
> overwritten. Companion to [`mvp-plan.md`](./mvp-plan.md) (the original build) —
> this picks up after that and keeps going. Each entry covers what was asked,
> what was decided (especially anything non-obvious), and what shipped. For how
> a feature actually works today, see the feature docs it links to — this file
> is the *history*, not the reference.

## Artists search page

Added `/artists` — a dedicated page for searching bands by name/handle, separate
from Explore's combined song-and-band search. No schema changes; `Band` already
had everything needed (`username`, `displayName`, `avatarUrl`, `bio`). Results
link into the existing `/[username]` profile pages rather than duplicating
profile UI.

## Account settings

Added `/dashboard/settings`: display name, avatar, email change, password
change, and account deletion — nothing like this existed before (only
artist/band-level settings did). Decisions worth remembering:

- **Account deletion is guarded**, not unconditional. `SongProject.ownerId ->
  User` cascades on delete, so deleting a user could silently delete songs out
  from under a band's other members. `assertCanDeleteAccount`
  (`src/lib/account-deletion.ts`) blocks deletion if the user is the sole admin
  of any band or has created any songs.
- **Email change** uses Better Auth's `changeEmail`, which had to be explicitly
  enabled (disabled by default) and sends its confirmation to the user's *old*
  address, not the new one — that's Better Auth's own design, not ours.
- **Delete-account UI always collects a password**, even though Better Auth's
  API treats it as optional — verified from source that omitting it fails with
  `SESSION_EXPIRED` for any session older than 24h (the default `freshAge`),
  i.e. almost every real user. Passing the password sidesteps that check
  entirely and is good practice anyway (re-verify identity before something
  irreversible).

## Top nav style pass

The nav had grown cluttered over several earlier additions (Explore, Artists,
Settings links all landing inline) — up to ~10 separate items in the busiest
state. Asked to make it "bigger and less cluttered."

- **Decision: consolidate, don't just resize.** Account-management links
  (Dashboard, credits, Settings, Sign out) moved into one avatar-triggered
  `AccountMenu` dropdown; primary nav (Explore, Artists, Library, band switcher)
  stayed inline, sized up.
- This pushed the desktop/mobile breakpoint from `sm` to `md` — the bigger
  sizing didn't comfortably fit at `sm` even after consolidation.
- **Follow-up refinement**, once the dropdown existed: removed the now-duplicate
  Credits entry from `AccountMenu` (the inline pill already shows it on
  desktop), and moved the theme toggle out of being a standalone header icon
  into the hamburger menu (mobile) / account menu (desktop) — except for
  logged-out desktop users, who have no menu to put it in, so it stayed inline
  there as the one exception.
- Mobile kept "Explore" inline in the top bar rather than hamburger-only, per
  explicit request.

## "Coming soon" modal for buying credits

Stripe isn't configured yet on this instance. Rather than show a developer-facing
"payments not configured, set STRIPE_SECRET_KEY" message (fine for self-hosters
reading code, not great for a real visitor), `buy-credits.tsx` now always shows
the real package cards — clicking Buy opens a friendly "coming soon" dialog
instead of attempting checkout. No backend change; once Stripe keys are set, the
exact same buttons start working for real.

## Credits transparency: "how to earn" + cost on the button

Added a "How credits work" section to `/dashboard/credits` (earn via engagement,
spend on uploads) and put the cost directly on upload buttons (e.g. "Upload
version · 10 credits") rather than only in separate nearby text — so the cost is
visible right where the user commits to it.

## Coupon system

Asked for a way to give free credits and discounts via codes. Two kinds:
`FREE_CREDITS` (grants credits directly) and `PERCENT_OFF`/`FIXED_OFF` (discounts
a Stripe purchase). Full design in [`credits-and-payments.md#coupons`](./credits-and-payments.md#coupons).

- **Decision: web admin UI, not a CLI script.** The codebase's only existing
  precedent for "operator does a privileged thing" (the federation hub) is a CLI
  script with no web session check at all — no platform-admin concept existed.
  Chose to build minimal admin-gating infrastructure (`ADMIN_EMAILS` env var)
  rather than reuse the CLI pattern, since the operator wanted to issue codes
  spontaneously without production terminal access.
- New `Coupon` + `CouponRedemption` tables; redemption capped per-band via a
  unique constraint, with the discount-kind redemption recorded by the Stripe
  webhook (not at checkout time) so an abandoned purchase doesn't burn the code.

## Admin namespace: `/dashboard/coupons` → `/admin`

Almost immediately after building it, moved the coupon admin page from
`/dashboard/coupons` to `/admin/coupons` plus a new `/admin` index page.
Reasoning given: more admin tools were coming, and `/dashboard` felt too tied to
the artist-facing experience for something meant for exactly one person (the
operator). Set up `/admin` as a real namespace (with its own index) specifically
so future admin features have an obvious home, rather than re-deciding this each
time. See [`admin.md`](./admin.md).

## Gift credits

Asked for a way to directly credit a specific user — for compensating bug
reports/good feedback, or topping up the operator's own account. Separate from
coupons entirely (no code, no redemption cap, repeatable).

- **Decision: resolve by band username OR user email.** Credits live on `Band`,
  not `User`, but "gift credits to a user" is how people actually think about
  it — so the input accepts either, resolving an email to the user's sole band
  and refusing (rather than guessing) if they have zero or multiple bands.
- Added an optional `note` field (new `CreditTransaction.note` column) purely
  for the operator's own record-keeping — shown in a gift history list, never
  to the recipient.

## Fixed: coupon redemption was per-band, not per-user

Asked to confirm a coupon could only be redeemed once per user. It couldn't —
redemption was capped only by `(couponId, bandId)`. Since one user can own
several bands and switching the active band is just a header dropdown (free,
instant), a user could redeem the same code once per band they controlled.
Reproduced the exploit directly against the database to confirm, then added a
second unique constraint on `(couponId, userId)` and threaded the real `userId`
through to the Stripe webhook (via Checkout Session metadata, since the webhook
itself has no session) so discount-coupon redemptions get a real user attached
too. Re-verified the exploit is closed the same way it was reproduced.

## Documentation overhaul

`docs/credits-and-payments.md` turned out to describe a **fundamentally wrong**
model — it said credits were `User.credits` with a 150/50 starting-balance/
upload-cost split, when the real, current model is `Band.credits` at 100/10 (and
had been for a while; the doc was just never updated). Rewrote it to match
reality, added the engagement-rewards mechanic (never documented at all) and a
coupons section, wrote a new [`admin.md`](./admin.md), and updated README/
DEPLOYMENT for the new env var and feature list. This file is the result of the
same conversation, written specifically so the *next* round of features doesn't
leave the same kind of gap.
