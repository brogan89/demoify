"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth-client";

export function AccountPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not change password");
      return;
    }
    toast.success("Password changed");
    setCurrentPassword("");
    setNewPassword("");
    setRevokeOtherSessions(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={revokeOtherSessions}
          onChange={(e) => setRevokeOtherSessions(e.target.checked)}
          disabled={busy}
          className="size-4 rounded border-input"
        />
        Sign out of other devices
      </label>
      <div className="flex justify-end">
        <Button type="submit" disabled={busy || !currentPassword || newPassword.length < 8}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
