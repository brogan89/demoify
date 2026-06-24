"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession, signOut } from "@/lib/auth-client";

export function SiteHeader() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Disc3 className="size-5 text-primary" suppressHydrationWarning />
          Demoify
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {isPending ? null : session ? (
            <>
              <Link
                href="/dashboard/credits"
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                title="Buy credits"
              >
                <Coins className="size-3.5 text-primary" suppressHydrationWarning />
                {(session.user as { credits?: number }).credits ?? 0}
              </Link>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
