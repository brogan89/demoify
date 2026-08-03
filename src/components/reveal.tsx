"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-triggered reveal. Server-renders hidden — the content is still in the
 * DOM (SEO-safe), and globals.css un-hides it for no-JS visitors
 * (`@media (scripting: none)`) and for prefers-reduced-motion users (shown
 * immediately, no transition — handled entirely in CSS). One-shot: disconnects
 * after the first show.
 *
 * Stagger siblings by passing increasing delays: `delay={i * 100}`.
 */
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
}: {
  children: ReactNode;
  /** Transition delay in ms, applied only to the reveal itself. */
  delay?: number;
  direction?: "up" | "none";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Anything already at or above the fold shows without waiting for the
    // observer — IntersectionObserver delivery can be deferred (hidden or
    // throttled documents), and content must never depend on it to appear.
    // Intentionally synchronous: the effect runs after first paint, so this IS
    // the hidden→shown transition for above-fold content.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        // Reveal when entering from below — or when already above the viewport
        // (jump scrolls and anchor links can skip the intersecting state
        // entirely; without this the element would stay invisible forever).
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          setShown(true);
          io.disconnect();
        }
      },
      // The huge top margin makes everything scrolled past count as visible.
      { rootMargin: "9999px 0px -10% 0px", threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      data-state={shown ? "shown" : "hidden"}
      // The delay must be in place when the transition starts (the render that
      // flips data-state), so it stays applied for the life of the element —
      // nothing else ever transitions on this wrapper.
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        "data-[state=hidden]:opacity-0",
        direction === "up" && "data-[state=hidden]:translate-y-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
