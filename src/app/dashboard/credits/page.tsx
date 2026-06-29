import { redirect } from "next/navigation";
import { Coins, Heart, MessageCircle, Play, Upload } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { getActiveBand } from "@/lib/band";
import { isStripeConfigured } from "@/lib/stripe";
import {
  CREDIT_PACKAGES,
  ENGAGEMENT_CREDITS,
  UPLOAD_COST,
  uploadsRemaining,
  creditsEnabled,
} from "@/lib/credits";
import { BuyCredits } from "@/components/buy-credits";

export default async function CreditsPage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  // No credit economy on this instance (self-hosting) — nothing to show here.
  if (!creditsEnabled()) redirect("/dashboard");

  const active = await getActiveBand();
  if (!active) redirect("/dashboard");
  const credits = active.band.credits;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3 rounded-lg border bg-card p-5">
        <Coins className="size-8 text-primary" />
        <div>
          <p className="text-2xl font-semibold">{credits} credits</p>
          <p className="text-sm text-muted-foreground">
            {active.band.displayName} · ≈ {uploadsRemaining(credits)} upload
            {uploadsRemaining(credits) === 1 ? "" : "s"} left · each upload costs{" "}
            {UPLOAD_COST} credits
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-sm font-medium">How credits work</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Coins className="size-4 text-primary" />
            Earn credits for free
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            Engage with other artists&rsquo; songs — once per song, per action:
          </p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Heart className="size-3.5" />
              Like a song — +{ENGAGEMENT_CREDITS.like} credit
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="size-3.5" />
              Comment on a song — +{ENGAGEMENT_CREDITS.comment} credits
            </li>
            <li className="flex items-center gap-2">
              <Play className="size-3.5" />
              Play a song — +{ENGAGEMENT_CREDITS.play} credits
            </li>
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Upload className="size-4 text-primary" />
            Spend credits
          </p>
          <p className="text-sm text-muted-foreground">
            Each track upload — a new song or a new version — costs {UPLOAD_COST} credits.
          </p>
        </div>
      </div>

      <h1 className="mb-1 text-xl font-semibold">Buy credits</h1>
      <p className="mb-6 text-sm text-muted-foreground">100 credits = $1.00.</p>

      <BuyCredits packages={CREDIT_PACKAGES} paymentsEnabled={isStripeConfigured()} />
    </div>
  );
}
