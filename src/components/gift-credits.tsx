"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { giftCredits } from "@/app/actions/admin";

export type GiftRow = {
  id: string;
  amount: number;
  note: string | null;
  createdAt: Date;
  band: { username: string; displayName: string };
};

export function GiftCredits({ gifts }: { gifts: GiftRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      toast.error("Amount must be a positive whole number");
      return;
    }
    startTransition(async () => {
      const res = await giftCredits({ target, amount: amountNum, note: note.trim() || undefined });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Gifted ${res.amount} credits to ${res.band}`);
      setTarget("");
      setAmount("");
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Gift credits</h2>
        <div className="space-y-1.5">
          <Label htmlFor="gift-target">Band username or user email</Label>
          <Input
            id="gift-target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="dolphin-drive or someone@email.com"
            required
            disabled={pending}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="gift-amount">Credits</Label>
            <Input
              id="gift-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={pending}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gift-note">Note (optional — why you&rsquo;re gifting this)</Label>
          <Textarea
            id="gift-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reported the upload bug on March 3rd"
            rows={2}
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Gift className="size-4" />
          {pending ? "Gifting…" : "Gift credits"}
        </Button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-medium">Recent gifts{gifts.length > 0 && ` (${gifts.length})`}</h2>
        {gifts.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No gifts yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {gifts.map((g) => (
              <li key={g.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    +{g.amount} credits → {g.band.displayName}{" "}
                    <span className="text-xs text-muted-foreground">@{g.band.username}</span>
                  </p>
                  {g.note && <p className="truncate text-xs text-muted-foreground">{g.note}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(g.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
