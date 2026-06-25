"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Surfaces the result of a returning tip Checkout redirect (?tip=success|cancelled),
// then strips the query param. Mounted on pages that host a TipButton.
export function TipResultToast({ bandName }: { bandName: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    const status = params.get("tip");
    if (status === "success") {
      toast.success(`Thank you for supporting ${bandName}! 💜`);
      router.replace(pathname);
    } else if (status === "cancelled") {
      toast.info("Tip cancelled");
      router.replace(pathname);
    }
  }, [params, pathname, router, bandName]);

  return null;
}
