"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    setBusy(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not send reset email");
      return;
    }
    // Don't reveal whether the address exists.
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        If an account exists for that address, a password reset link is on its way. Check your
        inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
