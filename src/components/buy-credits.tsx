"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatUsd, type CreditPackage } from "@/lib/credits";

export function BuyCredits({
  packages,
  paymentsEnabled,
}: {
  packages: CreditPackage[];
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);

  // Surface the result of a returning Stripe Checkout redirect.
  useEffect(() => {
    const status = params.get("purchase");
    if (status === "success") {
      toast.success("Payment received — credits added");
      router.replace("/dashboard/credits");
      router.refresh();
    } else if (status === "cancelled") {
      toast.info("Purchase cancelled");
      router.replace("/dashboard/credits");
    }
  }, [params, router]);

  async function buy(packageId: string) {
    // Payments aren't wired up yet — show the real packages so the page
    // doesn't look unfinished, but don't attempt a checkout.
    if (!paymentsEnabled) {
      setComingSoonOpen(true);
      return;
    }
    setBusy(packageId);
    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.assign(data.url); // hand off to Stripe Checkout
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(null);
    }
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="text-base">{p.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-2xl font-semibold">{p.credits}</p>
              <p className="text-sm text-muted-foreground">credits</p>
              <Button
                className="w-full"
                disabled={busy !== null}
                onClick={() => buy(p.id)}
              >
                {busy === p.id ? "Redirecting…" : `Buy · ${formatUsd(p.priceCents)}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming soon</DialogTitle>
            <DialogDescription>
              Buying credits isn&rsquo;t available just yet — we&rsquo;re still setting up
              payments. Check back soon!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setComingSoonOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
