"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { Check, ChevronsUpDown, Settings, Users } from "lucide-react";
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
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent disabled:opacity-50"
      >
        <Users className="size-3.5 text-primary" />
        <span className="max-w-[10rem] truncate">{active?.displayName}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Your bands</DropdownMenuLabel>
        {bands.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onSelect={() => switchTo(b.id)}
            className="flex items-center justify-between gap-2"
          >
            <span className="min-w-0 truncate">
              {b.displayName}
              <span className="ml-1 text-xs text-muted-foreground">
                {b.role.toLowerCase()}
              </span>
            </span>
            {b.id === active?.id && <Check className="size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/band" className="flex items-center gap-2">
            <Settings className="size-3.5" />
            Manage band
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
