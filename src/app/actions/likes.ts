"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/session";
import { grantEngagementCredits } from "@/lib/engagement";

/**
 * Toggle the current user's like on a public song. Returns the new state and
 * fresh count. Liking is restricted to PUBLIC songs (the feed and library are
 * public-only).
 */
export async function toggleLike(projectId: string) {
  const gate = await requireVerifiedUser();
  if (!gate.ok) return { error: gate.error, code: gate.code };
  const user = gate.user;

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    include: { band: { select: { username: true } } },
  });
  if (!project || project.visibility !== "PUBLIC") {
    return { error: "Song not found" as const };
  }

  // Toggle by trying to delete the like; if it wasn't there (P2025), create it.
  let liked: boolean;
  let earned = 0;
  try {
    await prisma.like.delete({
      where: { projectId_userId: { projectId, userId: user.id } },
    });
    liked = false;
  } catch (err) {
    if ((err as { code?: string }).code !== "P2025") throw err;
    await prisma.like.create({ data: { projectId, userId: user.id } });
    liked = true;
    // Reward the engager (once per song; not for your own band's songs).
    earned = await grantEngagementCredits({
      engagerUserId: user.id,
      songBandId: project.bandId,
      projectId,
      reason: "like",
    });
  }

  const count = await prisma.like.count({ where: { projectId } });

  revalidatePath("/explore");
  revalidatePath("/library");
  revalidatePath(`/${project.band.username}/${project.slug}`);
  return { liked, count, earned };
}
