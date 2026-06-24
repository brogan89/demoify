"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  ACTIVE_BAND_COOKIE,
  getMembership,
  canManageMembers,
  type Role,
} from "@/lib/band";

const ROLES: Role[] = ["ADMIN", "MANAGER", "MEMBER"];

/** Switch which band the user is acting as (persisted in a cookie). */
export async function setActiveBand(bandId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const role = await getMembership(bandId, user.id);
  if (!role) return { error: "Not a member of that band" };

  (await cookies()).set(ACTIVE_BAND_COOKIE, bandId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/dashboard");
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
