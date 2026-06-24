"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    setBusy(true);
    const { error } = await signIn.email({
      email,
      password: String(form.get("password")),
    });
    setBusy(false);

    if (error) {
      if (error.code === "EMAIL_NOT_VERIFIED") {
        toast.error("Verify your email first — we just sent a new link");
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }
      toast.error(error.message ?? "Invalid email or password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
