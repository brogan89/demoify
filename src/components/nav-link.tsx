"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Header nav item that knows when its route is active. Rendered inside the
 * server-component header — this is the only client piece it needs.
 */
export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Button
      asChild
      variant="ghost"
      size="lg"
      className="text-base data-active:bg-muted/60 data-active:text-foreground"
    >
      <Link
        href={href}
        data-active={active ? "" : undefined}
        aria-current={active ? "page" : undefined}
      >
        {children}
      </Link>
    </Button>
  );
}
