"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectPayouts({
  paymentsEnabled,
  connected,
  payoutsEnabled,
}: {
  paymentsEnabled: boolean;
  connected: boolean;
  payoutsEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);

  // Surface the return from Stripe's hosted onboarding. The account.updated
  // webhook flips payoutsEnabled shortly after; refresh to pick it up.
  useEffect(() => {
    if (params.get("return") === "1") {
      toast.success("Thanks — your payout details were saved");
      router.replace("/dashboard/payouts");
      router.refresh();
    } else if (params.get("refresh") === "1") {
      toast.info("Onboarding wasn't finished — pick up where you left off");
      router.replace("/dashboard/payouts");
    }
  }, [params, router]);

  async function start() {
    setBusy(true);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start onboarding");
      window.location.href = data.url; // hand off to Stripe hosted onboarding
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Onboarding failed");
      setBusy(false);
    }
  }

  if (!paymentsEnabled) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Payments are not configured yet — set{" "}
        <code className="font-mono">STRIPE_SECRET_KEY</code> to enable tips and payouts.
      </div>
    );
  }

  if (payoutsEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <CheckCircle2 className="size-6 text-primary" />
          <div>
            <p className="font-medium">Tips are active</p>
            <p className="text-sm text-muted-foreground">
              Listeners can tip you, and payouts go straight to your connected account.
            </p>
          </div>
        </div>
        <Button variant="outline" disabled={busy} onClick={start}>
          {busy ? "Opening…" : "Manage payout details"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connected && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
          <Clock className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Your payout account is connected but not finished. Complete the remaining
            steps to start receiving tips.
          </p>
        </div>
      )}
      <Button disabled={busy} onClick={start}>
        {busy ? "Opening…" : connected ? "Finish payout setup" : "Set up payouts"}
      </Button>
    </div>
  );
}
