import { redirect } from "next/navigation";
import { Banknote } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured } from "@/lib/stripe";
import { PLATFORM_FEE_PERCENT } from "@/lib/tips";
import { ConnectPayouts } from "@/components/connect-payouts";

export default async function PayoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const active = await getActiveBand();
  if (!active) redirect("/dashboard");

  const band = await prisma.band.findUnique({
    where: { id: active.band.id },
    select: { stripeAccountId: true, payoutsEnabled: true },
  });

  const artistShare = 100 - PLATFORM_FEE_PERCENT;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Banknote className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Tips &amp; payouts</h1>
          <p className="text-sm text-muted-foreground">
            Let listeners tip {active.band.displayName}. You keep {artistShare}% of every
            tip; {PLATFORM_FEE_PERCENT}% supports Demoify&rsquo;s development.
          </p>
        </div>
      </div>

      <ConnectPayouts
        paymentsEnabled={isStripeConfigured()}
        connected={Boolean(band?.stripeAccountId)}
        payoutsEnabled={Boolean(band?.payoutsEnabled)}
      />
    </div>
  );
}
