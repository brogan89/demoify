"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { applyCoupon } from "@/app/actions/coupons";

type AppliedDiscount = { code: string; kind: "PERCENT_OFF" | "FIXED_OFF"; amount: number };

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
  const [couponInput, setCouponInput] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(null);

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

  async function applyCode() {
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const result = await applyCoupon(couponInput);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.kind === "FREE_CREDITS") {
        toast.success(`+${result.credits} credits added!`);
        setCouponInput("");
        router.refresh();
      } else {
        setAppliedDiscount({ code: result.code, kind: result.kind, amount: result.amount });
        toast.success("Discount applied — pick a package below");
      }
    } finally {
      setCouponBusy(false);
    }
  }

  function discountedPrice(priceCents: number): number {
    if (!appliedDiscount) return priceCents;
    const off =
      appliedDiscount.kind === "PERCENT_OFF"
        ? Math.round((priceCents * appliedDiscount.amount) / 100)
        : appliedDiscount.amount;
    return Math.max(0, priceCents - off);
  }

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
        body: JSON.stringify({
          packageId,
          ...(appliedDiscount ? { couponCode: appliedDiscount.code } : {}),
        }),
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
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyCode()}
            placeholder="Have a code?"
            className="pl-8"
            disabled={couponBusy}
            aria-label="Coupon code"
          />
        </div>
        <Button variant="outline" onClick={applyCode} disabled={couponBusy || !couponInput.trim()}>
          {couponBusy ? "Applying…" : "Apply"}
        </Button>
      </div>

      {appliedDiscount && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-primary">
          <Tag className="size-3.5" />
          {appliedDiscount.kind === "PERCENT_OFF"
            ? `${appliedDiscount.amount}% off`
            : `${formatUsd(appliedDiscount.amount)} off`}{" "}
          applied — pick a package below
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {packages.map((p) => {
          const finalPrice = discountedPrice(p.priceCents);
          const discounted = finalPrice !== p.priceCents;
          return (
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
                  {busy === p.id ? (
                    "Redirecting…"
                  ) : discounted ? (
                    <>
                      Buy ·{" "}
                      <span className="line-through opacity-70">{formatUsd(p.priceCents)}</span>{" "}
                      {formatUsd(finalPrice)}
                    </>
                  ) : (
                    `Buy · ${formatUsd(p.priceCents)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
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
