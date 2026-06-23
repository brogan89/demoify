-- AlterTable
ALTER TABLE "user" ADD COLUMN     "credits" INTEGER NOT NULL DEFAULT 150;

-- CreateTable
CREATE TABLE "credit_transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_transaction_stripeSessionId_key" ON "credit_transaction"("stripeSessionId");

-- CreateIndex
CREATE INDEX "credit_transaction_userId_idx" ON "credit_transaction"("userId");

-- AddForeignKey
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
