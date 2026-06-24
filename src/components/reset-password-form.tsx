"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [busy, setBusy] = useState(false);

  // Better Auth redirects here with ?error=INVALID_TOKEN when the link is bad/expired.
  if (linkError || !token) {
    return (
      <p className="text-sm text-muted-foreground">
        This reset link is invalid or expired.{" "}
        <Link href="/forgot-password" className="text-primary underline-offset-4 hover:underline">
          Request a new one
        </Link>
        .
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token: token! });
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not reset password");
      return;
    }
    toast.success("Password updated — log in with your new password");
    router.push("/login");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}
