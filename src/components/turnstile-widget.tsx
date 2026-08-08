"use client";

import { useEffect, useRef } from "react";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | null = null;

/** Load the Turnstile script once, no matter how many widgets mount. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (loader) return loader;
  loader = new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile loaded without exposing its API"));
    });
    script.addEventListener("error", () => reject(new Error("Turnstile script failed to load")));
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((err) => {
    // Let a later mount retry rather than caching the failure forever.
    loader = null;
    throw err;
  });
  return loader;
}

type Props = {
  /** From turnstileSiteKey() on the server. Null renders nothing. */
  siteKey: string | null;
  /** Called with a solved token, or null when it expires or errors. */
  onToken: (token: string | null) => void;
  /**
   * Bump to discard the current token and re-challenge. Turnstile tokens are
   * single-use, so a form MUST reset after any failed submit — otherwise the
   * retry replays a spent token and fails verification for the wrong reason.
   */
  resetKey?: number;
};

export function TurnstileWidget({ siteKey, onToken, resetKey = 0 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Kept in a ref so a new onToken closure each render doesn't tear down and
  // re-render the widget. Synced in an effect rather than during render —
  // Turnstile's callbacks only fire on user interaction, long after commit.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey) return;
    const box = boxRef.current;
    if (!box) return;

    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !boxRef.current) return;
        widgetIdRef.current = turnstile.render(boxRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onTokenRef.current(token),
          "error-callback": () => onTokenRef.current(null),
          "expired-callback": () => onTokenRef.current(null),
        });
      })
      .catch((err) => {
        console.error("[turnstile]", err);
        // Leave the token null — the form will surface the server's refusal.
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        window.turnstile.remove(id);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey === 0) return;
    const id = widgetIdRef.current;
    if (id && window.turnstile) window.turnstile.reset(id);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={boxRef} className="flex justify-center" />;
}
