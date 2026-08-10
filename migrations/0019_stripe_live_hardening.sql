-- Stripe go-live hardening (issue #14). Three additive changes:
--
-- 1. UNIQUE index on band.stripeAccountId — the account.updated webhook
--    updates bands BY stripeAccountId (updateMany), so two bands sharing one
--    Connect account would both flip on every event. This also backstops the
--    check-then-act race in /api/connect/onboard: with the idempotency key +
--    conditional claim in code, the index is the last line of defence. SQLite
--    treats NULLs as distinct, so any number of un-onboarded bands coexist.
--
-- 2. band.payoutsSyncedAt — the `created` timestamp of the last APPLIED
--    account.updated event. Stripe doesn't guarantee delivery order, and the
--    old unconditional write meant a retried older event could silently turn
--    a working artist's payouts back off. The webhook now only applies events
--    strictly newer than this watermark.
--
-- 3. credit_transaction.amountPaidCents — what the buyer actually paid
--    (Stripe's session.amount_total). Distinct from `delta` (credits granted)
--    the moment a discount coupon is used: 150 credits bought with a 50%-off
--    code is delta=150 but amountPaidCents=75. Revenue reporting summed delta
--    as cents, overstating revenue on every discounted sale. Null for
--    non-purchase rows and for purchases made before this migration.
--
-- Additive column/index changes only, no table rebuild — safe under D1's
-- always-on foreign-key enforcement (same pattern as prior migrations).

CREATE UNIQUE INDEX "band_stripeAccountId_key" ON "band"("stripeAccountId");

ALTER TABLE "band" ADD COLUMN "payoutsSyncedAt" DATETIME;

ALTER TABLE "credit_transaction" ADD COLUMN "amountPaidCents" INTEGER;
