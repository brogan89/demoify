"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, MailWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeEmail, authClient } from "@/lib/auth-client";
import { TurnstileWidget } from "@/components/turnstile-widget";

export function AccountEmailForm({
  initialEmail,
  emailVerified,
  verificationRequired,
  turnstileSiteKey,
}: {
  initialEmail: string;
  emailVerified: boolean;
  /** Whether unverified accounts are actually held to read-only on this instance. */
  verificationRequired: boolean;
  turnstileSiteKey: string | null;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

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

  async function sendVerification() {
    // /send-verification-email is captcha-gated when Turnstile is configured,
    // so the token has to ride along or the server refuses the request.
    if (turnstileSiteKey && !captchaToken) {
      toast.error("Please complete the bot check");
      return;
    }
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({
      email: initialEmail,
      callbackURL: "/dashboard/settings",
      ...(captchaToken
        ? { fetchOptions: { headers: { "x-captcha-response": captchaToken } } }
        : {}),
    });
    setSending(false);
    // Tokens are single-use — re-challenge whether or not it worked.
    setCaptchaToken(null);
    setCaptchaReset((n) => n + 1);

    if (error) {
      toast.error(error.message ?? "Could not send verification email");
      return;
    }
    setSent(true);
    toast.success("Verification email sent — check your inbox");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label htmlFor="currentEmail">Current email</Label>
          {emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-3" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-500">
              <MailWarning className="size-3" />
              Not verified
            </span>
          )}
        </div>
        <Input id="currentEmail" value={initialEmail} disabled />
      </div>

      {!emailVerified && (
        <div className="space-y-3 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs text-muted-foreground">
            {verificationRequired
              ? "Confirm this address to unlock uploading, commenting and liking. Until then your account is read-only."
              : "Confirm this address so we know we can reach you."}
          </p>
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            onToken={setCaptchaToken}
            resetKey={captchaReset}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={sendVerification}
            disabled={sending}
          >
            {sending ? "Sending…" : sent ? "Send again" : "Send verification email"}
          </Button>
        </div>
      )}

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
