import { getCurrentUser } from "@/lib/session";

/** Comma-separated platform-operator emails (case-insensitive). */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

/**
 * True if the currently signed-in user is a platform admin.
 *
 * Requires a verified address as well as a listed one: admin rights are granted
 * purely by email match, so an unverified account claiming an admin address
 * must not inherit them. Admins are grandfathered by migration 0016 (they'll
 * have content), and can verify normally otherwise.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.emailVerified) return false;
  return isAdminEmail(user.email);
}
