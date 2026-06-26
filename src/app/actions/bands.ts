"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  ACTIVE_BAND_COOKIE,
  getMembership,
  canManageMembers,
  canManageSongs,
  type Role,
} from "@/lib/band";
import { uniqueBandUsername } from "@/lib/username";
import { STARTING_CREDITS, NEW_ARTIST_CREDITS } from "@/lib/credits";
import { cleanSocialLinks, type SocialLinkMap } from "@/lib/socials";

const ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];
const MAX_NAME_LENGTH = 60;
const MAX_BIO_LENGTH = 500;

/** Persist the active-band cookie (shared by setActiveBand and createArtistProfile). */
async function writeActiveBandCookie(bandId: string) {
  (await cookies()).set(ACTIVE_BAND_COOKIE, bandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Switch which band the user is acting as (persisted in a cookie). */
export async function setActiveBand(bandId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getMembership(bandId, user.id);
  if (!role) return { error: "Not a member of that band" };

  await writeActiveBandCookie(bandId);
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Create an artist profile for the current user. The user's *first* artist gets
 * the full STARTING_CREDITS (≈10 free uploads); any *additional* artist is free
 * to create but starts with just one free upload's worth. The user becomes its
 * ADMIN and it's switched to active.
 */
export async function createArtistProfile(input: { name: string }) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const name = input.name.trim();
  if (!name) return { error: "Artist name is required" };
  if (name.length > MAX_NAME_LENGTH) {
    return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
  }

  // First artist gets the full starting balance; later ones get the reduced amount.
  const existingMemberships = await prisma.bandMembership.count({
    where: { userId: user.id },
  });
  const credits = existingMemberships === 0 ? STARTING_CREDITS : NEW_ARTIST_CREDITS;

  const band = await prisma.band.create({
    data: {
      username: await uniqueBandUsername(name),
      displayName: name,
      credits,
    },
  });
  await prisma.bandMembership.create({
    data: { bandId: band.id, userId: user.id, role: "ADMIN" },
  });

  await writeActiveBandCookie(band.id);
  revalidatePath("/dashboard");
  return { ok: true, username: band.username };
}

/** Update an artist profile's display name, bio, logo, and/or links. ADMIN/MANAGER only. */
export async function updateArtistProfile(input: {
  bandId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: SocialLinkMap;
}) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getMembership(input.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  const data: {
    displayName?: string;
    bio?: string | null;
    avatarUrl?: string;
    socialLinks?: string | null;
  } = {};
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (!name) return { error: "Name can't be empty" };
    if (name.length > MAX_NAME_LENGTH) {
      return { error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` };
    }
    data.displayName = name;
  }
  if (input.bio !== undefined) {
    const bio = input.bio.trim();
    if (bio.length > MAX_BIO_LENGTH) {
      return { error: `Bio must be ${MAX_BIO_LENGTH} characters or fewer` };
    }
    data.bio = bio || null;
  }
  if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;
  if (input.socialLinks !== undefined) {
    const cleaned = cleanSocialLinks(input.socialLinks);
    if ("error" in cleaned) return { error: cleaned.error };
    data.socialLinks = Object.keys(cleaned.ok).length ? JSON.stringify(cleaned.ok) : null;
  }

  const band = await prisma.band.update({ where: { id: input.bandId }, data });

  revalidatePath("/dashboard/band");
  revalidatePath(`/${band.username}`);
  return { ok: true };
}

/** Add an existing Demoify user (by email) to the band with a role. ADMIN only. */
export async function addMember(bandId: string, email: string, role: Role) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (!ROLES.includes(role)) return { error: "Invalid role" };

  const actorRole = await getMembership(bandId, user.id);
  if (!canManageMembers(actorRole)) return { error: "Not allowed" };

  const target = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });
  if (!target) return { error: "No Demoify user with that email" };

  const existing = await prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId, userId: target.id } },
    select: { id: true },
  });
  if (existing) return { error: "Already a member of this band" };

  await prisma.bandMembership.create({ data: { bandId, userId: target.id, role } });
  revalidatePath("/dashboard/band");
  return { ok: true };
}

export async function removeMember(membershipId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const membership = await prisma.bandMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, bandId: true, role: true },
  });
  if (!membership) return { error: "Member not found" };

  const actorRole = await getMembership(membership.bandId, user.id);
  if (!canManageMembers(actorRole)) return { error: "Not allowed" };

  // Don't strand a band with no admin.
  if (membership.role === "ADMIN" && (await adminCount(membership.bandId)) <= 1) {
    return { error: "Can't remove the last admin" };
  }

  await prisma.bandMembership.delete({ where: { id: membershipId } });
  revalidatePath("/dashboard/band");
  return { ok: true };
}

export async function updateMemberRole(membershipId: string, role: Role) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };
  if (!ROLES.includes(role)) return { error: "Invalid role" };

  const membership = await prisma.bandMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, bandId: true, role: true },
  });
  if (!membership) return { error: "Member not found" };

  const actorRole = await getMembership(membership.bandId, user.id);
  if (!canManageMembers(actorRole)) return { error: "Not allowed" };

  // Demoting the last admin would leave the band leaderless.
  if (
    membership.role === "ADMIN" &&
    role !== "ADMIN" &&
    (await adminCount(membership.bandId)) <= 1
  ) {
    return { error: "Can't demote the last admin" };
  }

  await prisma.bandMembership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath("/dashboard/band");
  return { ok: true };
}

function adminCount(bandId: string) {
  return prisma.bandMembership.count({ where: { bandId, role: "ADMIN" } });
}
