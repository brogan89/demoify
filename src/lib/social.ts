// Server-only: reads provider credentials from the environment.
export type SocialProvider = "google" | "apple";

/** Which social providers have credentials configured (server-side only). */
export function enabledSocialProviders(): SocialProvider[] {
  const list: SocialProvider[] = [];
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) list.push("google");
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) list.push("apple");
  return list;
}
