"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/credits";
import {
  MAX_TIP_CENTS,
  MIN_TIP_CENTS,
  PLATFORM_FEE_PERCENT,
  TIP_PRESETS_CENTS,
} from "@/lib/tips";

export function TipButton({
  bandId,
  bandDisplayName,
  projectId,
  returnPath,
  isAuthed,
  canTip,
}: {
  bandId: string;
  bandDisplayName: string;
  projectId?: string;
  returnPath: string;
  isAuthed: boolean;
  canTip: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<number>(TIP_PRESETS_CENTS[1]);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);

  // Artists who haven't enabled payouts can't receive tips.
  if (!canTip) return null;

  // A custom dollar amount (when entered) wins over the selected preset.
  const customCents = custom.trim() ? Math.round(Number(custom) * 100) : null;
  const amountCents = customCents ?? preset;
  const validCustom = customCents === null || Number.isFinite(customCents);
  const amountOk =
    Number.isInteger(amountCents) &&
    amountCents >= MIN_TIP_CENTS &&
    amountCents <= MAX_TIP_CENTS;

  const artistShare = 100 - PLATFORM_FEE_PERCENT;

  function onTrigger() {
    if (!isAuthed) {
      router.push("/login");
      return;
    }
    setOpen(true);
  }

  async function send() {
    if (!amountOk) {
      toast.error(
        `Enter an amount between ${formatUsd(MIN_TIP_CENTS)} and ${formatUsd(MAX_TIP_CENTS)}`,
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/tips/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bandId, amountCents, projectId, returnPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url; // hand off to Stripe Checkout
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={onTrigger}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <HandCoins className="size-3.5 text-primary" />
        Tip
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tip {bandDisplayName}</DialogTitle>
            <DialogDescription>
              {artistShare}% goes straight to {bandDisplayName}; {PLATFORM_FEE_PERCENT}% supports
              Demoify&rsquo;s development. Thank you for backing {bandDisplayName} — and for
              supporting Demoify. 💜
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {TIP_PRESETS_CENTS.map((cents) => {
                const active = !custom.trim() && preset === cents;
                return (
                  <button
                    key={cents}
                    type="button"
                    onClick={() => {
                      setPreset(cents);
                      setCustom("");
                    }}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {formatUsd(cents)}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tip-custom">Custom amount (USD)</Label>
              <Input
                id="tip-custom"
                type="number"
                min={MIN_TIP_CENTS / 100}
                max={MAX_TIP_CENTS / 100}
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 7.50"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={send}
              disabled={busy || !amountOk || !validCustom}
              className="w-full"
            >
              {busy
                ? "Redirecting…"
                : amountOk
                  ? `Tip ${formatUsd(amountCents)}`
                  : "Tip"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
