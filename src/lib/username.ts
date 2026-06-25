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

/** Minimum length for a user-chosen handle. */
export const MIN_USERNAME_LENGTH = 3;

/** Canonical handle form for a `user.username` — slugified, URL-safe. */
export function normalizeUsername(raw: string): string {
  return slugify(raw);
}

/**
 * True when a normalized handle can be claimed as a `user.username`: non-empty,
 * long enough, not a reserved route, and not already taken by another user.
 */
export async function isUserUsernameAvailable(username: string): Promise<boolean> {
  if (username.length < MIN_USERNAME_LENGTH) return false;
  if (RESERVED_USERNAMES.has(username)) return false;
  const existing = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return !existing;
}

/**
 * Slugify a name into a unique `user.username`, suffixed with -2, -3, … on
 * clashes and stepping past reserved route names. The safety net used by the
 * auth create hook (social signups have no chosen handle; email signups are
 * pre-checked but a race could still collide).
 */
export async function uniqueUserUsername(base: string): Promise<string> {
  const root = slugify(base) || "user";
  let candidate = root;
  let n = 1;
  while (
    RESERVED_USERNAMES.has(candidate) ||
    (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } }))
  ) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}
