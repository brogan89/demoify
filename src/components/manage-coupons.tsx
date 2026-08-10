"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createCoupon, setCouponActive } from "@/app/actions/coupons";
import {
  formatUsd,
  packagesUsableWith,
  CREDIT_PACKAGES,
  type DiscountKind,
} from "@/lib/credits";

type CouponKind = "FREE_CREDITS" | "PERCENT_OFF" | "FIXED_OFF";

export type CouponRow = {
  id: string;
  code: string;
  kind: CouponKind;
  amount: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  active: boolean;
  expiresAt: Date | null;
};

const KIND_LABELS: Record<CouponKind, string> = {
  FREE_CREDITS: "Free credits",
  PERCENT_OFF: "Percent off",
  FIXED_OFF: "Fixed amount off",
};

function formatAmount(kind: CouponKind, amount: number): string {
  switch (kind) {
    case "FREE_CREDITS":
      return `${amount} credits`;
    case "PERCENT_OFF":
      return `${amount}% off`;
    case "FIXED_OFF":
      return `${formatUsd(amount)} off`;
  }
}

function amountLabel(kind: CouponKind): string {
  switch (kind) {
    case "FREE_CREDITS":
      return "Credits to grant";
    case "PERCENT_OFF":
      return "Percent off (1-99)";
    case "FIXED_OFF":
      return "Cents off";
  }
}

/**
 * Live preview of where a discount can actually be used: Stripe rejects any
 * charge under $0.50, so a deep discount silently excludes small packs (or
 * every pack). Surfacing it here beats an operator discovering it from a
 * user's "the code didn't work" report.
 */
function DiscountApplicability({ kind, amount }: { kind: CouponKind; amount: number }) {
  if (kind === "FREE_CREDITS" || !Number.isInteger(amount) || amount <= 0) return null;
  if (kind === "PERCENT_OFF" && amount >= 100) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-500">
        Use &ldquo;Free credits&rdquo; instead — Stripe can&rsquo;t process a $0.00 charge.
      </p>
    );
  }
  const usable = packagesUsableWith(kind as DiscountKind, amount);
  if (usable.length === 0) {
    return (
      <p className="text-xs text-amber-600 dark:text-amber-500">
        No package clears Stripe&rsquo;s $0.50 minimum with this discount — it can&rsquo;t be
        created.
      </p>
    );
  }
  if (usable.length === CREDIT_PACKAGES.length) {
    return <p className="text-xs text-muted-foreground">Applies to all packages.</p>;
  }
  const excluded = CREDIT_PACKAGES.filter((p) => !usable.some((u) => u.id === p.id));
  return (
    <p className="text-xs text-muted-foreground">
      Applies to: {usable.map((p) => p.label).join(", ")}. Not{" "}
      {excluded.map((p) => p.label).join(", ")} — under Stripe&rsquo;s $0.50 minimum.
    </p>
  );
}

/** True when a stored discount coupon can't be applied to any package. */
function isUnusable(c: CouponRow): boolean {
  return c.kind !== "FREE_CREDITS" && packagesUsableWith(c.kind, c.amount).length === 0;
}

export function ManageCoupons({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<CouponKind>("FREE_CREDITS");
  const [amount, setAmount] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      toast.error("Amount must be a positive whole number");
      return;
    }
    startTransition(async () => {
      const res = await createCoupon({
        code: code.trim() || undefined,
        kind,
        amount: amountNum,
        maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
        expiresAt: expiresAt || null,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Coupon ${res.code} created`);
      setCode("");
      setAmount("");
      setMaxRedemptions("");
      setExpiresAt("");
      router.refresh();
    });
  }

  function toggleActive(id: string, active: boolean) {
    startTransition(async () => {
      const res = await setCouponActive(id, active);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Create a coupon</h2>
        <div className="space-y-1.5">
          <Label htmlFor="coupon-code">Code (optional — auto-generated if blank)</Label>
          <Input
            id="coupon-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="WELCOME50"
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="coupon-kind">Kind</Label>
            <Select
              id="coupon-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as CouponKind)}
              disabled={pending}
            >
              {Object.entries(KIND_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-amount">{amountLabel(kind)}</Label>
            <Input
              id="coupon-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={pending}
            />
            <DiscountApplicability kind={kind} amount={Number(amount)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="coupon-max">Max redemptions (optional)</Label>
            <Input
              id="coupon-max"
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
              placeholder="Unlimited"
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coupon-expires">Expires (optional)</Label>
            <Input
              id="coupon-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Ticket className="size-4" />
          Create coupon
        </Button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-medium">
          Coupons{coupons.length > 0 && ` (${coupons.length})`}
        </h2>
        {coupons.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No coupons yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {coupons.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-3 rounded-lg border p-3 ${c.active ? "" : "opacity-50"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-medium">{c.code}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatAmount(c.kind, c.amount)} · {c.redemptionCount}/
                    {c.maxRedemptions ?? "∞"} redeemed ·{" "}
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never expires"}
                  </p>
                  {isUnusable(c) && (
                    <p className="truncate text-xs text-amber-600 dark:text-amber-500">
                      Unusable — every discounted price is under Stripe&rsquo;s $0.50 minimum
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => toggleActive(c.id, !c.active)}
                >
                  {c.active ? "Disable" : "Enable"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
