import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * Returns the current Better Auth session (or null) for the incoming request.
 * Cached per-request so multiple calls in one render don't re-hit the DB.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}
