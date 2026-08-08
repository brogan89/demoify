"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { TurnstileWidget } from "@/components/turnstile-widget";

export function ResendVerificationForm({
  turnstileSiteKey,
}: {
  turnstileSiteKey: string | null;
}) {
  const prefilled = useSearchParams().get("email") ?? "";
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email"));
    if (turnstileSiteKey && !captchaToken) {
      toast.error("Please complete the bot check");
      return;
    }
    setBusy(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
      ...(captchaToken
        ? { fetchOptions: { headers: { "x-captcha-response": captchaToken } } }
        : {}),
    });
    setBusy(false);
    setCaptchaToken(null);
    setCaptchaReset((n) => n + 1);

    if (error) {
      toast.error(error.message ?? "Could not send verification email");
      return;
    }
    toast.success("Verification email sent — check your inbox");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required defaultValue={prefilled} />
      </div>
      <TurnstileWidget
        siteKey={turnstileSiteKey}
        onToken={setCaptchaToken}
        resetKey={captchaReset}
      />
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
