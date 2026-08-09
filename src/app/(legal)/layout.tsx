import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal";

/**
 * Shared shell for /terms, /privacy, and /dmca.
 *
 * The project has no @tailwindcss/typography plugin, so element styling is
 * applied here with descendant variants rather than repeated on every tag in
 * three long documents.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <article
        className={[
          "[&_h1]:font-heading [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight md:[&_h1]:text-4xl",
          "[&_h2]:font-heading [&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight",
          "[&_h3]:mt-6 [&_h3]:mb-1 [&_h3]:font-semibold",
          "[&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted-foreground",
          "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
          "[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
          "[&_li]:text-sm [&_li]:leading-relaxed [&_li]:text-muted-foreground",
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
        ].join(" ")}
      >
        {children}

        <hr className="mt-12 border-t" />
        <p className="mt-4 text-xs">
          Last updated {LEGAL_LAST_UPDATED}. Questions about anything on this page:{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        </p>
        <nav className="mt-3 flex flex-wrap gap-4 text-xs">
          <Link href="/terms">Terms of Use</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/dmca">Copyright &amp; DMCA</Link>
        </nav>
      </article>
    </div>
  );
}
