"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";

export function SignupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const bandName = String(form.get("bandName")).trim();

    if (!bandName) {
      toast.error("Band name is required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setBusy(true);
    // Username is derived from the band name server-side (see auth create hook).
    const { data, error } = await signUp.email({
      email,
      password,
      name: bandName,
      displayName: bandName,
    } as Parameters<typeof signUp.email>[0]);
    setBusy(false);

    if (error) {
      toast.error(error.message ?? "Could not create account");
      return;
    }
    // When verification is required there's no session yet (token is null) →
    // send them to verify. Otherwise they're signed in → straight to dashboard.
    const signedIn = Boolean((data as { token?: string | null } | null)?.token);
    if (signedIn) {
      toast.success("Welcome to Demoify");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.success("Account created — check your email to verify");
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bandName">Band name</Label>
        <Input id="bandName" name="bandName" required placeholder="Band Name" />
        <p className="text-xs text-muted-foreground">
          Your public URL is created from this, e.g. demoify.com/
          <span className="font-mono">band-name</span>/song
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creating…" : "Create account"}
      </Button>
    </form>
  );
}
