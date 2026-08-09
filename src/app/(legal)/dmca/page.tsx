import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Copyright & DMCA",
  description:
    "Demoify is for your own work. How to report infringing material, what a valid notice needs, and how to file a counter-notice.",
};

export default function DmcaPage() {
  return (
    <>
      <h1>Copyright &amp; DMCA</h1>
      <p>
        Demoify exists for musicians to share <strong>their own</strong> work in progress.
        Uploading other people’s recordings, unlicensed samples, or commercial releases is against
        the <Link href="/terms">Terms of Use</Link> and will be removed.
      </p>
      <p>
        Demoify is operated from New Zealand. We follow the notice-and-takedown process set out
        below — modelled on the US Digital Millennium Copyright Act — for all complaints,
        wherever the rights holder is.
      </p>

      <h2>Reporting infringing material</h2>
      <p>
        Send a notice to <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> with
        the subject line “Copyright notice”. To be actionable it needs to include all of the
        following:
      </p>
      <ol>
        <li>
          Your physical or electronic signature, and whether you are the rights holder or
          authorised to act for them.
        </li>
        <li>
          Identification of the work you say has been infringed — a title, release, and where it
          can be heard.
        </li>
        <li>
          The full URL of the song page on demoify.app that contains the material, so it can be
          located. A screenshot alone is not enough.
        </li>
        <li>Your name, postal address, and email address.</li>
        <li>
          A statement that you believe in good faith that the use is not authorised by the rights
          holder, its agent, or the law.
        </li>
        <li>
          A statement that the information in the notice is accurate and — under penalty of
          perjury — that you are the rights holder or authorised to act on their behalf.
        </li>
      </ol>
      <p>
        Please send notices about material you actually hold rights in. Knowingly making a
        material misrepresentation can make you liable for damages, including costs and legal
        fees.
      </p>

      <h2>What happens next</h2>
      <p>
        Valid notices are actioned promptly — usually by making the song inaccessible while it is
        reviewed. We will let the uploader know what was removed and why, and pass on your notice
        so they can respond. Where a complaint is ambiguous we may contact you for more detail
        before acting.
      </p>

      <h2>If your song was removed by mistake</h2>
      <p>
        If you believe your material was taken down in error or through misidentification, send a
        counter-notice to <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>{" "}
        including:
      </p>
      <ol>
        <li>Your signature, name, postal address, email address, and phone number.</li>
        <li>Identification of what was removed and the URL where it used to appear.</li>
        <li>
          A statement under penalty of perjury that you believe in good faith it was removed as a
          result of mistake or misidentification.
        </li>
        <li>
          A statement that you consent to the jurisdiction of the courts where you live, or of New
          Zealand if you are outside it, and that you will accept service from the person who
          filed the original notice.
        </li>
      </ol>
      <p>
        We will forward the counter-notice to the original complainant. If they do not tell us
        within 10 to 14 business days that they have filed for a court order, the material may be
        restored.
      </p>

      <h2>Repeat infringers</h2>
      <p>
        Accounts that attract repeated valid copyright complaints will be terminated and their
        content removed.
      </p>

      <h2>A note for artists</h2>
      <p>
        If you found your own unreleased music here and you did not put it there, email us and say
        so — that is exactly the situation this process exists for, and it will be treated
        urgently.
      </p>
    </>
  );
}
