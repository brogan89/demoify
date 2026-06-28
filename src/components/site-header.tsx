import Link from "next/link";
import { Coins, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";
import { BandSwitcher } from "@/components/band-switcher";
import { MobileNav } from "@/components/mobile-nav";
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
        {/* Below sm the inline nav doesn't fit portrait phones — collapse to a menu. */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <MobileNav
            isAuthed={Boolean(user)}
            hasBand={Boolean(active)}
            bandName={active?.band.displayName ?? null}
            credits={active?.band.credits ?? null}
            showCredits={creditsEnabled()}
          />
        </div>
        <nav className="hidden items-center gap-2 sm:flex">
          <a
            href="https://github.com/brogan89/demoify"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Demoify on GitHub"
            title="View on GitHub"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
          >
            <GithubIcon className="size-5" />
          </a>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/explore">Explore</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/artists">Artists</Link>
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

// GitHub's brand mark — Lucide dropped brand icons, so inline the official SVG.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
