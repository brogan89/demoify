import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/** Cookie that remembers which band the user is currently acting as. */
export const ACTIVE_BAND_COOKIE = "active_band";

export type Role = "ADMIN" | "MANAGER" | "MEMBER";

export type BandMembershipWithBand = {
  role: Role;
  band: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    credits: number;
  };
};

/** Every band the current user belongs to, oldest membership first. */
export const getMyBands = cache(async (): Promise<BandMembershipWithBand[]> => {
  const user = await getCurrentUser();
  if (!user) return [];
  const memberships = await prisma.bandMembership.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      band: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          credits: true,
        },
      },
    },
  });
  return memberships.map((m) => ({ role: m.role as Role, band: m.band }));
});

/**
 * The band the user is currently acting as: the one named by the `active_band`
 * cookie if they're a member, otherwise their first band. Null if not signed in
 * or not in any band.
 */
export const getActiveBand = cache(async (): Promise<BandMembershipWithBand | null> => {
  const bands = await getMyBands();
  if (bands.length === 0) return null;
  const activeId = (await cookies()).get(ACTIVE_BAND_COOKIE)?.value;
  return bands.find((b) => b.band.id === activeId) ?? bands[0];
});

/** The current user's role in a specific band, or null if not a member. */
export async function getMembership(bandId: string, userId: string): Promise<Role | null> {
  const m = await prisma.bandMembership.findUnique({
    where: { bandId_userId: { bandId, userId } },
    select: { role: true },
  });
  return (m?.role as Role) ?? null;
}

// --- Role predicates -------------------------------------------------------
/** ADMIN + MANAGER can create / upload / delete songs and toggle visibility. */
export function canManageSongs(role: Role | null): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Only ADMIN can add / remove members and change roles. */
export function canManageMembers(role: Role | null): boolean {
  return role === "ADMIN";
}

/** Any member can view + comment on the band's private songs. */
export function isMember(role: Role | null): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "MEMBER";
}
