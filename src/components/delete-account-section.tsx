"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { deleteUser } from "@/lib/auth-client";

export function DeleteAccountSection() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    const { error } = await deleteUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not delete account");
      return;
    }
    toast.success("Account deleted");
    router.push("/");
  }

  if (!confirming) {
    return (
      <Button
        variant="destructive"
        size="sm"
        className="gap-1.5"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-3.5" />
        Delete account
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-destructive/50 p-4">
      <p className="text-sm text-muted-foreground">
        This permanently deletes your account. This can&rsquo;t be undone.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="deleteAccountPassword">Confirm your password</Label>
        <PasswordInput
          id="deleteAccountPassword"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="destructive" size="sm" disabled={busy || !password} onClick={onDelete}>
          {busy ? "Deleting…" : "Yes, delete my account"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => {
            setConfirming(false);
            setPassword("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
