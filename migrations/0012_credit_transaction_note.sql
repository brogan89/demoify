-- Admin "gift credits" feature (src/app/actions/admin.ts, /admin/credits):
-- lets the operator directly credit a band, e.g. to compensate a bug report or
-- comp a refund, outside the coupon-redemption flow. `note` records why, shown
-- in the admin gift history; null for every other credit_transaction reason.
--
-- Additive nullable column, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as 0006_artist_bio.sql / 0010_band_social_links.sql).

ALTER TABLE "credit_transaction" ADD COLUMN "note" TEXT;
