import { redirect } from "next/navigation";
import { Coins } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isStripeConfigured } from "@/lib/stripe";
import { CREDIT_PACKAGES, UPLOAD_COST, uploadsRemaining } from "@/lib/credits";
import { BuyCredits } from "@/components/buy-credits";

export default async function CreditsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { credits: true },
  });
  const credits = user?.credits ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3 rounded-lg border bg-card p-5">
        <Coins className="size-8 text-primary" />
        <div>
          <p className="text-2xl font-semibold">{credits} credits</p>
          <p className="text-sm text-muted-foreground">
            ≈ {uploadsRemaining(credits)} upload{uploadsRemaining(credits) === 1 ? "" : "s"} left
            · each upload costs {UPLOAD_COST} credits
          </p>
        </div>
      </div>

      <h1 className="mb-1 text-xl font-semibold">Buy credits</h1>
      <p className="mb-6 text-sm text-muted-foreground">100 credits = $1.00.</p>

      <BuyCredits packages={CREDIT_PACKAGES} paymentsEnabled={isStripeConfigured()} />
    </div>
  );
}
