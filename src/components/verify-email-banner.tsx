import Link from "next/link";
import { MailWarning } from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { requireEmailVerification } from "@/lib/verification";

/**
 * Persistent notice for signed-in users whose email isn't verified yet.
 *
 * Deliberately NOT dismissible, unlike FederationBanner: this one explains why
 * half the site refuses to work. Hiding it would leave the user guessing at the
 * "Verify your email to do that" toasts.
 *
 * Renders nothing when the gate is off, so instances running without
 * verification never show it.
 */
export async function VerifyEmailBanner() {
  if (!requireEmailVerification()) return null;

  const user = await getCurrentUser();
  if (!user || user.emailVerified) return null;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <MailWarning className="size-4 shrink-0 text-amber-600 dark:text-amber-500" />
        <p className="text-sm">
          <strong>Verify your email to start posting.</strong> You can browse and listen now —
          uploading, commenting and liking unlock once you confirm your address.{" "}
          <Link
            href={`/verify-email?email=${encodeURIComponent(user.email)}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Resend the link
          </Link>
        </p>
      </div>
    </div>
  );
}
