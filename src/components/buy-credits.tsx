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
import { formatUsd, discountedPriceCents, type CreditPackage } from "@/lib/credits";
import { applyCoupon } from "@/app/actions/coupons";

type AppliedDiscount = {
  code: string;
  kind: "PERCENT_OFF" | "FIXED_OFF";
  amount: number;
  // Packages whose discounted price clears Stripe's $0.50 minimum — the rest
  // are sold at full price with the code omitted (server enforces the same).
  usablePackageIds: string[];
};

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
        setAppliedDiscount({
          code: result.code,
          kind: result.kind,
          amount: result.amount,
          usablePackageIds: result.usablePackageIds,
        });
        toast.success("Discount applied — pick a package below");
      }
    } finally {
      setCouponBusy(false);
    }
  }

  // True when the applied code can be used on this package (discounted total
  // clears Stripe's minimum). No code applied = trivially "usable" at list price.
  function couponUsableOn(packageId: string): boolean {
    return !appliedDiscount || appliedDiscount.usablePackageIds.includes(packageId);
  }

  // Same implementation as the server (src/lib/credits.ts) so the previewed
  // price and the charged price can't drift.
  function discountedPrice(p: CreditPackage): number {
    if (!appliedDiscount || !couponUsableOn(p.id)) return p.priceCents;
    return discountedPriceCents(appliedDiscount.kind, appliedDiscount.amount, p.priceCents);
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
          // Only send the code where it actually applies — sending it for an
          // ineligible pack would 400 at the server's minimum-charge check.
          ...(appliedDiscount && couponUsableOn(packageId)
            ? { couponCode: appliedDiscount.code }
            : {}),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      // A 200 with no url would otherwise navigate to the string "undefined".
      if (!data.url) throw new Error("Checkout did not return a redirect URL");
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
          const finalPrice = discountedPrice(p);
          const discounted = finalPrice !== p.priceCents;
          const codeExcluded = appliedDiscount !== null && !couponUsableOn(p.id);
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
                {codeExcluded && (
                  <p className="text-xs text-muted-foreground">
                    Code doesn&rsquo;t apply — the discounted price would be under
                    Stripe&rsquo;s $0.50 minimum.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payments not available</DialogTitle>
            <DialogDescription>
              Payments aren&rsquo;t configured on this instance, so credits can&rsquo;t be
              purchased. You can still earn credits by listening, liking, and commenting
              on other artists&rsquo; tracks.
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
