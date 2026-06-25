-- Tipping (real money) via Stripe Connect, split 90% artist / 10% platform.
--
-- Bands gain a connected Stripe (Express) account id plus a cached flag for
-- whether that account can receive money (kept fresh by the `account.updated`
-- webhook). The new `tip` table records each completed tip — it's the receipt /
-- history and the idempotency guard (unique stripeSessionId) for the webhook;
-- balances are NOT mutated here since Stripe moves the funds directly.
--
-- Additive columns on `band` + a brand-new table, no rebuild of any parent —
-- safe under D1's foreign-key enforcement (same pattern as 0004 / 0005 / 0006).

ALTER TABLE "band" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "band" ADD COLUMN "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "tip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bandId" TEXT NOT NULL,
    "tipperUserId" TEXT,
    "projectId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "artistCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tip_bandId_fkey" FOREIGN KEY ("bandId") REFERENCES "band" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tip_stripeSessionId_key" ON "tip"("stripeSessionId");
CREATE INDEX "tip_bandId_idx" ON "tip"("bandId");
