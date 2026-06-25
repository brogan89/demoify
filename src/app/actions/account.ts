"use server";

import {
  normalizeUsername,
  isUserUsernameAvailable,
  MIN_USERNAME_LENGTH,
} from "@/lib/username";

/**
 * Pre-submit username check for the signup form. Normalizes the raw input to a
 * handle, validates length, and reports whether it can be claimed. The auth
 * create hook re-normalizes and uniques as a safety net, but this gives the user
 * a clear "taken" message before the account is created.
 */
export async function checkUsernameAvailable(
  raw: string,
): Promise<{ available: boolean; username: string; error?: string }> {
  const username = normalizeUsername(raw);
  if (username.length < MIN_USERNAME_LENGTH) {
    return {
      available: false,
      username,
      error: `Username must be at least ${MIN_USERNAME_LENGTH} characters (letters, numbers, hyphens).`,
    };
  }
  const available = await isUserUsernameAvailable(username);
  return {
    available,
    username,
    error: available ? undefined : "That username is taken.",
  };
}
