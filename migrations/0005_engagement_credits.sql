-- Earn-credits-by-engagement: like/comment/play grant credits to the engager's
-- band. To cap each engager at one reward per song per action, the ledger gains
-- the engaging user and the song (projectId), plus a unique index over
-- (userId, reason, refId). SQLite treats NULLs as distinct, so existing
-- upload/purchase rows (null userId/refId) never collide. Additive columns + a
-- new index, no table rebuild — safe under D1's foreign-key enforcement.

ALTER TABLE "credit_transaction" ADD COLUMN "userId" TEXT;
ALTER TABLE "credit_transaction" ADD COLUMN "refId" TEXT;

CREATE UNIQUE INDEX "credit_transaction_userId_reason_refId_key"
  ON "credit_transaction" ("userId", "reason", "refId");
