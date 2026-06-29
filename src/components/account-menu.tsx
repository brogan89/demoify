"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggleMenuItem } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth-client";

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * Account-related links consolidated into one avatar-triggered menu, so the
 * desktop nav doesn't have to show Dashboard/Settings/credits/Sign out as
 * separate inline buttons. Dashboard + credits only render when there's an
 * active band; Settings + Sign out always render for an authed user.
 */
export function AccountMenu({
  displayName,
  avatarUrl,
  hasBand,
}: {
  displayName: string;
  avatarUrl: string | null;
  hasBand: boolean;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="Account menu" className="rounded-full transition-opacity hover:opacity-80">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(displayName || "?")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="truncate px-2 py-1.5 text-sm">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasBand && (
          <DropdownMenuItem asChild className="px-2 py-2 text-base">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <Link href="/dashboard/settings" className="flex items-center gap-2">
            <Settings className="size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <ThemeToggleMenuItem className="px-2 py-2 text-base" />
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void handleSignOut()} className="px-2 py-2 text-base">
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
