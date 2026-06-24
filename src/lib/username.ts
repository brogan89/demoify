import { prisma } from "@/lib/db";
import { slugify } from "@/lib/slug";

// Usernames that would collide with real top-level routes — a band can't claim
// these, so a profile at /[username] never shadows a page. (Kept dependency-light
// — no session import — so both auth.ts and server actions can use it without a
// circular import.)
export const RESERVED_USERNAMES = new Set([
  "explore",
  "library",
  "dashboard",
  "login",
  "signup",
  "api",
  "forgot-password",
  "reset-password",
  "verify-email",
]);

/**
 * Slugify a name into a unique `band.username` (the public URL handle), suffixed
 * with -2, -3, … on clashes and stepping past reserved route names.
 */
export async function uniqueBandUsername(base: string): Promise<string> {
  const root = slugify(base) || "band";
  let candidate = root;
  let n = 1;
  while (
    RESERVED_USERNAMES.has(candidate) ||
    (await prisma.band.findUnique({ where: { username: candidate }, select: { id: true } }))
  ) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
