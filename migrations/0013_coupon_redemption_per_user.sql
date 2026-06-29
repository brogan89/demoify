-- Close a gap in coupon redemption: the existing unique index on
-- coupon_redemption(couponId, bandId) only capped redemption per *band*. A
-- user who owns multiple bands could switch their active band (just a header
-- dropdown) and redeem the same code again for each one. This adds a second
-- unique index on (couponId, userId) so a single user is capped to one
-- redemption per coupon regardless of which band they're acting as.
--
-- Additive index only, no table rebuild — safe under D1's foreign-key
-- enforcement (same pattern as prior coupon migrations).

CREATE UNIQUE INDEX "coupon_redemption_couponId_userId_key" ON "coupon_redemption"("couponId", "userId");
