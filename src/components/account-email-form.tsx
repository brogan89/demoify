"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeEmail } from "@/lib/auth-client";

export function AccountEmailForm({ initialEmail }: { initialEmail: string }) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const { error } = await changeEmail({
      newEmail,
      callbackURL: "/dashboard/settings",
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not change email");
      return;
    }
    toast.success("Check your current inbox to confirm the change");
    setNewEmail("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentEmail">Current email</Label>
        <Input id="currentEmail" value={initialEmail} disabled />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newEmail">New email</Label>
        <Input
          id="newEmail"
          type="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          disabled={busy}
        />
        <p className="text-xs text-muted-foreground">
          We&rsquo;ll send a confirmation link to your current email — nothing changes until you click it.
        </p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !newEmail.trim()}>
          {busy ? "Sending…" : "Change email"}
        </Button>
      </div>
    </form>
  );
}
