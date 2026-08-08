import { isEmailConfigured } from "@/lib/email";

/**
 * Whether unverified accounts are held to read-only.
 *
 * Deliberately NOT derived from whether email is configured. The previous
 * behaviour (`EMAIL_VERIFICATION = isEmailConfigured()`) meant an empty or
 * rotated RESEND_API_KEY silently switched verification off for the whole
 * platform, with nothing downstream to notice — a fail-open that only shows up
 * as a spam wave. This fails closed instead: unset means "on in production".
 *
 *   "true"  → always on
 *   "false" → always off  (self-hosting, or the inert first deploy)
 *   unset   → on when NODE_ENV === "production"
 */
export function requireEmailVerification(): boolean {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "production";
}

let warned = false;

/**
 * Shout when the gate is on but we can't actually deliver the verification
 * email — users would be stuck read-only with no way out. The gate stays ON:
 * silently opening the door is what we're fixing. Call at auth module scope.
 */
export function warnIfUndeliverable(): void {
  if (warned) return;
  if (requireEmailVerification() && !isEmailConfigured()) {
    warned = true;
    console.error(
      "[verification] Email verification is ENFORCED but RESEND_API_KEY is unset — " +
        "new users cannot verify and will be stuck read-only. Set RESEND_API_KEY, " +
        "or set REQUIRE_EMAIL_VERIFICATION=false to disable the gate deliberately.",
    );
  }
}
