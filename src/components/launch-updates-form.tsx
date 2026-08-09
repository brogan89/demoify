"use client";

import { useState, useTransition } from "react";
import { Check, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { subscribeToLaunchUpdates } from "@/app/actions/subscribers";

/**
 * Email capture for launch updates.
 *
 * Shows a persistent confirmation rather than only a toast — someone who
 * submits and then scrolls needs to be able to tell they already did it, or
 * they submit again.
 */
export function LaunchUpdatesForm() {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await subscribeToLaunchUpdates(email);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setDone(true);
      setEmail("");
      toast.success(
        res.alreadySubscribed ? "You're already on the list" : "You're on the list",
      );
    });
  }

  if (done) {
    return (
      <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Check className="size-4 text-primary" />
        Thanks — we&rsquo;ll email you when there&rsquo;s something worth saying.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@band.com"
          aria-label="Email address for launch updates"
          autoComplete="email"
          required
          disabled={pending}
          className="flex-1"
        />
        <Button type="submit" disabled={pending} className="gap-1.5">
          <Mail className="size-3.5" />
          {pending ? "Adding…" : "Keep me posted"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Occasional updates only, no spam, unsubscribe any time. See our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
