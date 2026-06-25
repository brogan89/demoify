import Link from "next/link";
import { Coins, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { BandSwitcher } from "@/components/band-switcher";
import { getCurrentUser } from "@/lib/session";
import { getMyBands, getActiveBand } from "@/lib/band";
import { creditsEnabled } from "@/lib/credits";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const [bands, active] = user
    ? await Promise.all([getMyBands(), getActiveBand()])
    : [[], null];

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Disc3 className="size-5 text-primary" suppressHydrationWarning />
          Demoify
        </Link>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore">Explore</Link>
          </Button>
          {user && active ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/library">Library</Link>
              </Button>
              <BandSwitcher
                bands={bands.map((b) => ({
                  id: b.band.id,
                  displayName: b.band.displayName,
                  role: b.role,
                }))}
                activeBandId={active.band.id}
              />
              {creditsEnabled() && (
                <Link
                  href="/dashboard/credits"
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  title="Buy credits"
                >
                  <Coins className="size-3.5 text-primary" suppressHydrationWarning />
                  {active.band.credits}
                </Link>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <SignOutButton />
            </>
          ) : user ? (
            // Signed in but no artist profile yet — a listener. Give them the
            // full listening nav, with creating a profile as a low-key option.
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/library">Library</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/new-artist">Create artist profile</Link>
              </Button>
              <SignOutButton />
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
