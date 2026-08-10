import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The rules for using Demoify: you keep the rights to your music, upload only work you have the rights to, and what to expect from a service in early development.",
};

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p>
        These terms cover your use of Demoify at demoify.app (the “service”). The service is{" "}
        {LEGAL_OPERATOR}. By creating an account or uploading anything, you agree to what
        follows.
      </p>

      <h2>1. Your music stays yours</h2>
      <p>
        <strong>You keep every right you already have in what you upload.</strong> Demoify claims
        no ownership of your recordings, compositions, artwork, or any other content you put on
        the service. We do not acquire a stake in your work, we do not licence it to third
        parties, and we do not use it to train machine-learning models.
      </p>
      <p>
        You grant us only the narrow, non-exclusive permission needed to actually run the
        service: to store your files, to stream them to the people you share them with, to
        generate waveform data and preview images, and — for songs you have marked{" "}
        <strong>public</strong> — to display them in the Explore feed and in link previews. This
        permission is revocable: it ends for a given song when you delete it or set it to
        private, apart from copies that may briefly persist in backups or caches.
      </p>

      <h2>2. Only upload what you have the rights to</h2>
      <p>
        Demoify is for sharing your own work in progress. You may only upload material that you
        created, own, or otherwise have the rights to share. Specifically, you must not upload:
      </p>
      <ul>
        <li>Commercial releases, bootlegs, or other people’s recordings you did not make.</li>
        <li>
          Samples, stems, loops, or vocal takes you are not licensed to use and redistribute in a
          shared recording.
        </li>
        <li>
          Collaborators’ contributions they have not agreed to have posted — if a track has other
          people on it, make sure they are happy for it to be here.
        </li>
      </ul>
      <p>
        If you are not sure whether you have the rights to something, set the song to{" "}
        <strong>private</strong> so it stays visible only to your band, or leave it off the
        service. Copyright complaints are handled through the process on the{" "}
        <Link href="/dmca">Copyright &amp; DMCA</Link> page, and accounts that repeatedly infringe
        will be terminated.
      </p>

      <h2>3. What else isn’t allowed</h2>
      <ul>
        <li>Harassment, hate speech, or threats — in comments, song titles, or profile text.</li>
        <li>Content that is unlawful where you are or where the service operates.</li>
        <li>
          Using the service as general-purpose file storage or a CDN for material that isn’t music
          you are working on.
        </li>
        <li>
          Automated scraping, bulk downloading, or attempts to circumvent rate limits, private-song
          visibility, or the upload flow.
        </li>
      </ul>

      <h2>4. Your account</h2>
      <p>
        You need to be at least 16 to create an account. You are responsible for keeping your
        password safe and for what happens under your account. A band profile owns its public
        handle and its songs; if you invite other people into a band, they can act on the band’s
        songs according to the role you give them.
      </p>

      <h2>5. Public and private songs</h2>
      <p>
        Songs are public by default and appear in the Explore feed. Anyone with the link can play
        a public song without an account. Setting a song to private restricts it to members of
        that band. Treat “private” as access control, not as a security guarantee for material you
        cannot afford to have seen — do not upload anything whose disclosure would seriously harm
        you.
      </p>

      <h2>6. Money</h2>
      <p>
        <strong>Uploads are metered by credits; listening is free.</strong> Every new account
        starts with 100 free credits — enough for 10 uploads — and each upload costs 10 credits.
        You can earn more credits free by engaging with other artists&rsquo; music (listening,
        liking, commenting), or buy credit packs starting at $1.50 USD. Prices are always shown
        before you pay, and payment is processed by Stripe — we never see or store your card
        details.
      </p>
      <p>
        <strong>Credit purchases are final.</strong> Credits are a prepaid service credit, not a
        deposit: they have no cash value, are not transferable, and purchases are not refundable
        except where a law that applies to you (for example the NZ Consumer Guarantees Act, or
        EU/UK consumer rights) says otherwise. If a purchase goes wrong — you were charged and
        the credits never arrived — contact us and we will fix the balance or refund the charge.
      </p>
      <p>
        Where tipping is enabled, listeners can send money to an artist through Stripe Connect.
        The artist receives 90% and the service retains 10% as a platform fee. Tips are voluntary,
        are not refundable by us, and are settled by Stripe directly to the artist’s connected
        account under Stripe’s own terms.
      </p>

      <h2>7. The service is in early development</h2>
      <p>
        Demoify is built and run by one person and is early software. It is provided “as is”,
        without warranties of any kind. There is no uptime guarantee, features may change or be
        removed, and bugs may cause errors or loss of data. To the fullest extent the law allows,
        we are not liable for indirect or consequential loss, or for lost profits, revenue, or
        goodwill.
      </p>
      <p>
        <strong>Keep your own copies.</strong> Demoify is a place to share work in progress, not a
        backup service. Always keep the master files for anything you upload.
      </p>

      <h2>8. Ending things</h2>
      <p>
        You can delete your account yourself at any time from your account settings, which removes
        your songs and personal data as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>. We may suspend or terminate an account that
        breaks these terms, with notice where it is reasonable to give it, and without notice
        where the content is clearly infringing or harmful.
      </p>
      <p>
        If the service is ever shut down, we will give reasonable advance notice and a window to
        export your files. Demoify is open source and self-hostable, so the software itself will
        remain available regardless.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        These terms may change as the service develops. Material changes will be announced in the
        app or by email to the address on your account, and the revision date at the foot of this
        page will be updated. Continuing to use the service after a change means you accept it.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of New Zealand, and the New Zealand courts have
        non-exclusive jurisdiction. If you are a consumer somewhere with stronger local
        protections, nothing here removes rights you have under those laws.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, complaints, or legal notices: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </>
  );
}
