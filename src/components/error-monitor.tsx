"use client";

import { useEffect, useCallback } from "react";

/**
 * Client-side error reporter.
 *
 * Catches unhandled errors and unhandled promise rejections, then POSTs
 * them to /api/analytics/error for logging to Cloudflare Workers console.
 *
 * Also exposes a `reportError` function for manual error reporting in
 * try/catch blocks or event handlers.
 *
 * Usage: wrap your root layout with <ErrorMonitor /> or add its
 * useEffect to an existing "use client" root wrapper.
 */
export function ErrorMonitor({ userId }: { userId?: string }) {
  const report = useCallback(
    (message: string, stack?: string) => {
      try {
        const body = JSON.stringify({
          message,
          stack: stack?.slice(0, 1000),
          url: typeof window !== "undefined" ? window.location.href : undefined,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
          userId,
        });

        // Use sendBeacon when available (no response needed, doesn't block page unload)
        if (navigator?.sendBeacon) {
          navigator.sendBeacon("/api/analytics/error", body);
        } else {
          fetch("/api/analytics/error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Swallow — never throw from an error handler
      }
    },
    [userId],
  );

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report(event.message, event.error?.stack);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const message =
        event.reason instanceof Error ? event.reason.message : String(event.reason);
      const stack = event.reason instanceof Error ? event.reason.stack : undefined;
      report(message, stack);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [report]);

  return null;
}

/**
 * Manually report an error from a try/catch or event handler.
 */
export function reportError(error: unknown, userId?: string) {
  if (typeof window === "undefined") return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  try {
    const body = JSON.stringify({
      message,
      stack: stack?.slice(0, 1000),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId,
    });

    if (navigator?.sendBeacon) {
      navigator.sendBeacon("/api/analytics/error", body);
    } else {
      fetch("/api/analytics/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Swallow
  }
}