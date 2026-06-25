"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { normalizeUsername } from "@/lib/username";
import { checkUsernameAvailable } from "@/app/actions/account";

export function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const username = normalizeUsername(String(form.get("username") ?? ""));

    if (!username) {
      toast.error("Username is required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setBusy(true);
    // Strict username check before creating the account, so the user gets the
    // exact handle they chose (or a clear "taken" message).
    const check = await checkUsernameAvailable(username);
    if (!check.available) {
      setBusy(false);
      toast.error(check.error ?? "That username isn't available");
      return;
    }

    const { data, error } = await signUp.email({
      email,
      password,
      name: username,
      displayName: username,
      username,
    } as Parameters<typeof signUp.email>[0]);
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not create account");
      return;
    }
    // When verification is required there's no session yet (token is null) →
    // send them to verify. Otherwise they're signed in → on to create their
    // first artist profile.
    const signedIn = Boolean((data as { token?: string | null } | null)?.token);
    if (signedIn) {
      toast.success("Welcome to Demoify");
      router.push("/dashboard/new-artist");
      router.refresh();
    } else {
      toast.success("Account created — check your email to verify");
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" required placeholder="your-handle" />
        <p className="text-xs text-muted-foreground">
          Your personal handle on Demoify. Create an artist profile to upload songs, or
          just listen and comment &mdash; it&rsquo;s up to you.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
