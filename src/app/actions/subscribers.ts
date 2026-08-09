"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { underLimit, clientIp } from "@/lib/rate-limit";
import { REF_COOKIE, normalizeRefSource } from "@/lib/attribution";

/**
 * Launch-updates email capture.
 *
 * This is the one write path in the app that CANNOT take requireVerifiedUser():
 * its entire purpose is to hear from people who do not have an account. It is
 * listed EXEMPT in scripts/check-write-gates.mjs with that reason.
 *
 * Because the write gate can't defend it, it defends itself:
 *   - RL_PUBLIC, keyed by CF-Connecting-IP (its own limiter, so abuse here
 *     can't throttle the abuser out of logging in),
 *   - a length cap and a format check before anything touches the database,
 *   - upsert, so a resubmit is idempotent rather than a unique-constraint error.
 *
 * It writes exactly one row to a table with no relations. There is nothing here
 * to escalate into.
 */

/** Generous cap — the RFC maximum is 254, and anything longer is not an address. */
const MAX_EMAIL_LENGTH = 254;

/**
 * Deliberately permissive: one @, no whitespace, a dot in the domain.
 *
 * Stricter regexes reject valid addresses (plus-addressing, new TLDs, unicode
 * domains) and the cost of a bad row here is one dead address on a mailing
 * list, whereas the cost of a false reject is losing a real subscriber.
 * Deliverability is Resend's problem at send time, not ours at capture time.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubscribeResult = { ok: true; alreadySubscribed: boolean } | { error: string };

export async function subscribeToLaunchUpdates(rawEmail: string): Promise<SubscribeResult> {
  if (!(await underLimit("RL_PUBLIC", await clientIp()))) {
    return { error: "Too many attempts. Try again in a minute." };
  }

  // Lowercased so the UNIQUE index actually de-duplicates people.
  const email = rawEmail.trim().toLowerCase();

  if (email.length === 0) {
    return { error: "Enter an email address." };
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: "That doesn't look like an email address." };
  }

  let refSource: string | null = null;
  try {
    refSource = normalizeRefSource((await cookies()).get(REF_COOKIE)?.value);
  } catch {
    // Attribution is optional; never fail a subscribe over it.
  }

  const existing = await prisma.emailSubscriber.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // Idempotent, and deliberately does not overwrite the original refSource —
    // first touch stays first touch.
    return { ok: true, alreadySubscribed: true };
  }

  await prisma.emailSubscriber.create({ data: { email, refSource } });
  return { ok: true, alreadySubscribed: false };
}
