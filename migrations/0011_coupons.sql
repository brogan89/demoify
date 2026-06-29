-- Coupon codes: free-credit grants and purchase discounts, issued by a platform
-- admin (ADMIN_EMAILS, see src/lib/admin.ts) from /dashboard/coupons.
--
-- `coupon` holds the code + its kind/amount/limits. `coupon_redemption` is the
-- single source of truth for "has this band already used this coupon", for
-- both free-credit and discount coupons — capped to one redemption per band
-- per coupon via a unique index. Free-credit redemptions additionally write a
-- real credit_transaction row (the actual ledger entry, reason 'coupon');
-- discount redemptions only ever produce a coupon_redemption row, written by
-- the Stripe webhook once payment completes.
--
-- coupon_redemption.couponId has no ON DELETE CASCADE (D1 enforces foreign
-- keys, so this is load-bearing): coupons are disabled via the `active` flag,
-- never hard-deleted, specifically so a coupon can never be removed out from
-- under its own redemption history.
--
-- Brand-new tables only, no rebuild of any existing table — safe under D1's
-- foreign-key enforcement (same pattern as 0008_tips.sql).

CREATE TABLE "coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

CREATE TABLE "coupon_redemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "couponId" TEXT NOT NULL,
    "bandId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "coupon_redemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "coupon_redemption_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "band" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "coupon_redemption_couponId_bandId_key" ON "coupon_redemption"("couponId", "bandId");
CREATE INDEX "coupon_redemption_bandId_idx" ON "coupon_redemption"("bandId");
