"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  normalizeUsername,
  isUserUsernameAvailable,
  MIN_USERNAME_LENGTH,
} from "@/lib/username";

const MAX_DISPLAY_NAME_LENGTH = 60;

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

/** Update the current user's personal display name and/or avatar. */
export async function updateAccountProfile(input: {
  displayName?: string;
  avatarUrl?: string;
}): Promise<{ ok?: true; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const data: { displayName?: string; avatarUrl?: string } = {};
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (!name) return { error: "Name can't be empty" };
    if (name.length > MAX_DISPLAY_NAME_LENGTH) {
      return { error: `Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer` };
    }
    data.displayName = name;
  }
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (Object.keys(data).length === 0) return { ok: true };

  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath("/dashboard/settings");
  return { ok: true };
}
