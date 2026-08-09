import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Demoify collects, why, who it is shared with, how long it is kept, and how to get your data removed.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>
        Demoify is {LEGAL_OPERATOR}. This page explains what the service collects, why, and what
        you can do about it. It covers demoify.app only — a self-hosted Demoify instance is run by
        whoever operates it, and this policy does not apply there.
      </p>

      <h2>What we collect</h2>
      <h3>Account information</h3>
      <p>
        Your email address, display name, username, and — if you set one — an avatar image. If you
        sign up with a password, it is stored hashed and we never see the original. If you sign in
        with Google or Apple instead, we receive your email address and basic profile details from
        them, not your password.
      </p>
      <h3>What you upload and write</h3>
      <p>
        Audio files, version changelogs, artwork, song titles and descriptions, comments, and
        likes. Audio is stored in Cloudflare R2; everything else is in a Cloudflare D1 database.
      </p>
      <h3>Usage data</h3>
      <p>
        Play counts per song, which include plays by logged-out listeners. Standard server logs
        (IP address, user agent, requested URL, timestamp) are produced by Cloudflare for
        security, abuse prevention, and debugging. We also record a signup’s referral source — see
        Cookies below.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To run your account, serve your songs, and deliver comments and notifications.</li>
        <li>
          To send transactional email — address verification and password resets. We do not send
          marketing email to your account address unless you separately asked for launch updates.
        </li>
        <li>To prevent abuse, enforce rate limits, and investigate problems.</li>
        <li>
          To understand, in aggregate, how many people sign up and where they came from, so a
          small project can tell which of its efforts are worth repeating.
        </li>
      </ul>

      <h2>Who it is shared with</h2>
      <p>
        We do not sell your data and we do not share it with advertisers. Data is processed on our
        behalf by:
      </p>
      <ul>
        <li>
          <strong>Cloudflare</strong> — hosting, database (D1), file storage (R2), and network
          logs.
        </li>
        <li>
          <strong>Resend</strong> — sending transactional email. Receives your email address and
          the message.
        </li>
        <li>
          <strong>Stripe</strong> — payments and artist payouts, where those are enabled. Stripe
          collects card and bank details directly; we never receive or store them.
        </li>
        <li>
          <strong>Google / Apple</strong> — only if you choose to sign in with them.
        </li>
      </ul>
      <p>
        We will also disclose information where the law requires it, or where it is necessary to
        investigate a credible safety or copyright issue.
      </p>

      <h2>Federated Explore</h2>
      <p>
        Demoify instances can share a discovery feed. If a self-hosted instance is connected to a
        hub, the <strong>metadata</strong> of its public songs — title, artist name, artwork URL,
        genre, and a link back — may be submitted to that hub. Audio is never copied; it keeps
        streaming from the origin instance. Private songs are never submitted. On demoify.app this
        affects public songs only, and setting a song to private or deleting it withdraws it.
      </p>

      <h2>Cookies</h2>
      <p>Demoify sets a small number of first-party cookies. There is no advertising tracker.</p>
      <ul>
        <li>
          <strong>Session</strong> — keeps you signed in. Required for the site to work when
          logged in.
        </li>
        <li>
          <strong>Active band</strong> — remembers which of your band profiles you are currently
          acting as.
        </li>
        <li>
          <strong>Referral source</strong> — if you arrive via a tagged link (for example{" "}
          <code>?ref=reddit</code>), that tag is stored for up to 30 days and attached to your
          account if you sign up. It records the channel only — not your browsing elsewhere — and
          it is used to count signups per channel.
        </li>
      </ul>

      <h2>Where data is held</h2>
      <p>
        Cloudflare is a global network, so data may be processed in various countries, including
        outside New Zealand and the EEA. Our processors operate under their own data-protection
        commitments and standard contractual clauses where those apply.
      </p>

      <h2>How long it is kept</h2>
      <p>
        Account data and content are kept while your account exists. Delete your account from{" "}
        <strong>Settings</strong> and your songs, versions, comments, and personal details are
        removed. Backups and CDN caches may retain copies for a short period afterwards before
        they age out. Aggregate counts that cannot identify you — such as total signups in a month
        — may be retained.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live — including under the New Zealand Privacy Act 2020 and, in the
        EU and UK, the GDPR — you can ask for a copy of your data, correct it, delete it, object
        to a particular use, or ask for it in a portable form. Deletion is self-serve in Settings;
        for anything else, email{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and we will respond
        within 30 days. If you are in the EU or UK and are unhappy with the response, you may
        complain to your local data-protection authority; in New Zealand, to the Office of the
        Privacy Commissioner.
      </p>

      <h2>Children</h2>
      <p>
        Demoify is not intended for anyone under 16. If you believe a child has created an
        account, contact us and we will remove it.
      </p>

      <h2>Changes</h2>
      <p>
        This policy will change as the service does. Material changes will be announced in the app
        or by email, and the revision date below will be updated.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions and requests: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
        Copyright issues go through the <Link href="/dmca">Copyright &amp; DMCA</Link> process
        instead.
      </p>
    </>
  );
}
