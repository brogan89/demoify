import { APIError } from "better-auth/api";
import { prisma } from "@/lib/db";

/**
 * Blocks self-deletion if the user is the sole ADMIN of any band, or has
 * created any songs — deleting a User cascades to delete every SongProject
 * they own (even ones in a band with other active members), so this is the
 * only thing standing between self-serve deletion and that data loss. Any
 * future direct `prisma.user.delete(...)` call bypasses this entirely.
 */
export async function assertCanDeleteAccount(userId: string): Promise<void> {
  const memberships = await prisma.bandMembership.findMany({
    where: { userId },
    select: { bandId: true, role: true, band: { select: { displayName: true } } },
  });

  for (const m of memberships) {
    if (m.role !== "ADMIN") continue;
    const otherAdmins = await prisma.bandMembership.count({
      where: { bandId: m.bandId, role: "ADMIN", userId: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new APIError("BAD_REQUEST", {
        message: `You're the only admin of "${m.band.displayName}". Add another admin or leave the band before deleting your account.`,
      });
    }
  }

  const songCount = await prisma.songProject.count({ where: { ownerId: userId } });
  if (songCount > 0) {
    throw new APIError("BAD_REQUEST", {
      message: `You've created ${songCount} song${songCount === 1 ? "" : "s"}. Transfer ownership or delete ${songCount === 1 ? "it" : "them"} before deleting your account.`,
    });
  }
}
