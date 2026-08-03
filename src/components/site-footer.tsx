import Link from "next/link";
import { Disc3 } from "lucide-react";

const REPO = "https://github.com/brogan89/demoify";

// `NEXT_PUBLIC_APP_VERSION` is inlined at build time by CI (see the deploy
// workflow), which also tags the commit with the same value. Falls back to "dev"
// for local builds where it isn't set.
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row">
        <p className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-brand-gradient">
            <Disc3 className="size-3 text-white" suppressHydrationWarning />
          </span>
          © {new Date().getFullYear()} Demoify · Share music, get feedback.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/explore" className="transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link href="/artists" className="transition-colors hover:text-foreground">
            Artists
          </Link>
          <a
            href={`${REPO}#self-hosting`}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            Self-hosting
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          {VERSION ? (
            <a
              href={`${REPO}/releases/tag/${VERSION}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Deployed version"
              className="font-mono transition-colors hover:text-foreground"
            >
              {VERSION}
            </a>
          ) : (
            <span className="font-mono" title="Local build">
              dev
            </span>
          )}
        </nav>
      </div>
    </footer>
  );
}
