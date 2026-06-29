"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Plus, Settings, Users } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveBand } from "@/app/actions/bands";

export type BandOption = {
  id: string;
  displayName: string;
  role: string;
};

export function BandSwitcher({
  bands,
  activeBandId,
}: {
  bands: BandOption[];
  activeBandId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = bands.find((b) => b.id === activeBandId) ?? bands[0];

  function switchTo(bandId: string) {
    if (bandId === activeBandId) return;
    startTransition(async () => {
      const res = await setActiveBand(bandId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-base transition-colors hover:bg-accent disabled:opacity-50"
      >
        <Users className="size-4 text-primary" />
        <span className="max-w-[10rem] truncate">{active?.displayName}</span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel>Your artists</DropdownMenuLabel>
        {bands.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => switchTo(b.id)}
            className="flex items-center justify-between gap-2 px-2 py-2 text-base"
          >
            <span className="min-w-0 truncate">
              {b.displayName}
              <span className="ml-1 text-sm text-muted-foreground">
                {b.role.toLowerCase()}
              </span>
            </span>
            {b.id === active?.id && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <Link href="/dashboard/new-artist" className="flex items-center gap-2">
            <Plus className="size-4" />
            New artist profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="px-2 py-2 text-base">
          <Link href="/dashboard/band" className="flex items-center gap-2">
            <Settings className="size-4" />
            Manage artist
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
