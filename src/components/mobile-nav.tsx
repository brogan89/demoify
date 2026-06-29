"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Coins, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { ThemeToggleMenuItem } from "@/components/theme-toggle";

/**
 * The site nav collapsed into a hamburger menu for narrow (portrait phone)
 * screens, where the full inline nav doesn't fit. Shown below `sm`; the desktop
 * nav in SiteHeader takes over at `sm` and up. Mirrors the same auth states.
 */
export function MobileNav({
  isAuthed,
  hasBand,
  bandName,
  credits,
  showCredits,
}: {
  isAuthed: boolean;
  hasBand: boolean;
  bandName: string | null;
  credits: number | null;
  showCredits: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu"
        className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        <Menu className="size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        {isAuthed && hasBand && bandName && (
          <>
            <DropdownMenuLabel className="truncate">{bandName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <Link href="/explore">Explore</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <Link href="/artists">Artists</Link>
        </DropdownMenuItem>
        {isAuthed && (
          <DropdownMenuItem asChild className="px-2 py-2 text-base">
            <Link href="/library">Library</Link>
          </DropdownMenuItem>
        )}
        {isAuthed && hasBand && (
          <>
            <DropdownMenuItem asChild className="px-2 py-2 text-base">
              <Link href="/dashboard">Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2 py-2 text-base">
              <Link href="/dashboard/band">Manage artist</Link>
            </DropdownMenuItem>
            {showCredits && (
              <DropdownMenuItem asChild className="px-2 py-2 text-base">
                <Link href="/dashboard/credits" className="flex items-center gap-2">
                  <Coins className="size-4 text-primary" />
                  {credits} credits
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}
        {isAuthed && !hasBand && (
          <DropdownMenuItem asChild className="px-2 py-2 text-base">
            <Link href="/dashboard/new-artist">Create artist profile</Link>
          </DropdownMenuItem>
        )}
        {isAuthed && (
          <DropdownMenuItem asChild className="px-2 py-2 text-base">
            <Link href="/dashboard/settings">Settings</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <a href="https://github.com/brogan89/demoify" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </DropdownMenuItem>
        <ThemeToggleMenuItem className="px-2 py-2 text-base" />
        <DropdownMenuSeparator />
        {isAuthed ? (
          <DropdownMenuItem onSelect={() => void handleSignOut()} className="px-2 py-2 text-base">
            Sign out
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild className="px-2 py-2 text-base">
              <Link href="/login">Log in</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="px-2 py-2 text-base">
              <Link href="/signup">Sign up</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
