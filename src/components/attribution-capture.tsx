"use client";

import { useEffect } from "react";
import { captureRefSource } from "@/app/actions/attribution";

/**
 * Fires once per tagged landing to record where a visitor came from.
 *
 * Mounted in the root layout so a tagged link to ANY page attributes — the
 * launch plan hands out links to song pages and Explore, not just the homepage.
 *
 * Why a client effect and not middleware: Next 16's Proxy (the renamed
 * Middleware) is pinned to the Node.js runtime, which @opennextjs/cloudflare
 * refuses to build. A Server Component can't set cookies either, so a server
 * action invoked from the client is the remaining option on this stack.
 *
 * The trade-off is that a visitor with JS disabled isn't attributed. That's
 * acceptable: signup itself is a client-side form, so they could not have
 * converted anyway.
 *
 * The ref cookie is httpOnly and therefore invisible to this component, so it
 * can't check whether attribution already happened — sessionStorage keeps it to
 * one call per tab, and the action no-ops server-side on repeats.
 */
const ONCE_PER_TAB_KEY = "demoify_ref_sent";

export function AttributionCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("ref") ?? params.get("utm_source");
    if (!tag) return;

    try {
      if (sessionStorage.getItem(ONCE_PER_TAB_KEY)) return;
      sessionStorage.setItem(ONCE_PER_TAB_KEY, "1");
    } catch {
      // Private-mode browsers can throw on sessionStorage. Losing the
      // de-duplication is fine; the server call is idempotent.
    }

    // Fire and forget — nothing on the page depends on the outcome.
    void captureRefSource(tag);
  }, []);

  return null;
}
