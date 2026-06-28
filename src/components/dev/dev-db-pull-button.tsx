"use client";

import { useState } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Dev-only floating button that clones the production D1 into the local dev DB
 * (POST /api/dev/pull-prod-db). Lets you test against real data with writes/login
 * enabled. The layout only renders this under `npm run dev` — never in production
 * or `dev:remote`.
 */
export function DevDbPullButton() {
  const [loading, setLoading] = useState(false);

  async function pull() {
    if (loading) return;
    setLoading(true);
    const t = toast.loading("Pulling production data into local DB…");
    try {
      const res = await fetch("/api/dev/pull-prod-db", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Pull failed.");
      toast.success("Local DB now mirrors production — reloading…", { id: t });
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pull failed.", {
        id: t,
        duration: 10000,
      });
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={pull}
      disabled={loading}
      title="Clone the production database into your local dev DB"
      className="fixed left-4 top-20 z-[60] gap-2 border shadow-md"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <DatabaseZap className="size-4" />
      )}
      Pull prod data
    </Button>
  );
}
