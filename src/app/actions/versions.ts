"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/session";
import { getMembership, canManageSongs, isMember } from "@/lib/band";
import { UPLOAD_COST, creditsEnabled } from "@/lib/credits";
import { isPublicUrlUnder } from "@/lib/r2";
import { syncTrack } from "@/lib/federation";
import { sanitizePeaks, serializePeaks } from "@/lib/waveform";

const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS";

type CreateVersionInput = {
  projectId: string;
  audioUrl: string;
  changelog?: string | null;
  duration?: number | null;
  // Waveform peaks computed in the uploader's browser (see src/lib/waveform.ts).
  // Optional/best-effort: null when the uploader's browser couldn't decode.
  peaks?: number[] | null;
};

export async function createVersion(input: CreateVersionInput) {
  const gate = await requireVerifiedUser("RL_UPLOAD");
  if (!gate.ok) return { error: gate.error, code: gate.code };
  const user = gate.user;

  const project = await prisma.songProject.findUnique({
    where: { id: input.projectId },
    include: { band: { select: { username: true } } },
  });
  if (!project) return { error: "Project not found" };

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) return { error: "Not allowed" };

  // The client echoes back the publicUrl it got from /api/upload/presign, so it
  // must be pinned to this project's own audio prefix — otherwise any string
  // would be stored and then federated out as this song's audio.
  if (!isPublicUrlUnder(input.audioUrl, `songs/${project.id}/`)) {
    return { error: "Invalid audio URL" };
  }

  // D1 (SQLite) has no interactive transactions, so we can't read-then-write in one
  // atomic block. Instead: charge atomically up front (conditional decrement), then
  // write the version + ledger in one batch, refunding the charge if that write fails.
  // When the credit economy is disabled (self-hosting) we skip charging entirely.
  const charge = creditsEnabled();

  // 1. Charge the band's credits — atomic and conditional; guards double-spend.
  if (charge) {
    const charged = await prisma.band.updateMany({
      where: { id: project.bandId, credits: { gte: UPLOAD_COST } },
      data: { credits: { decrement: UPLOAD_COST } },
    });
    if (charged.count === 0) {
      return {
        error: `Not enough credits. Each upload costs ${UPLOAD_COST} credits.`,
        code: INSUFFICIENT_CREDITS,
      };
    }
  }

  try {
    // 2. Assign the next version number and write. The (projectId, versionNumber)
    // unique constraint guards concurrent inserts — on collision, retry with a
    // freshly-read number. Version row + ledger row commit together in one batch.
    for (let attempt = 0; attempt < 5; attempt++) {
      const last = await prisma.songVersion.findFirst({
        where: { projectId: project.id },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });
      const versionNumber = (last?.versionNumber ?? 0) + 1;

      // Re-validate the client-computed peaks — this is an open action, so only
      // a plausible normalized array is ever stored (anything else becomes null).
      const peaks = sanitizePeaks(input.peaks);

      const versionData = {
        projectId: project.id,
        versionNumber,
        audioUrl: input.audioUrl,
        changelog: input.changelog?.trim() || null,
        duration: input.duration ?? null,
        peaks: peaks ? serializePeaks(peaks) : null,
      };

      try {
        // Version row (+ the spend ledger row when charging) commit together.
        const [version] = charge
          ? await prisma.$transaction([
              prisma.songVersion.create({ data: versionData }),
              prisma.creditTransaction.create({
                data: { bandId: project.bandId, delta: -UPLOAD_COST, reason: "upload" },
              }),
            ])
          : await prisma.$transaction([prisma.songVersion.create({ data: versionData })]);

        // A new version on a public song refreshes its hub mirror (latest audio).
        await syncTrack(project.id);

        revalidatePath(`/dashboard/${project.id}`);
        revalidatePath(`/${project.band.username}/${project.slug}`);
        return { version };
      } catch (err) {
        // Unique collision on (projectId, versionNumber) → another upload raced us; retry.
        if ((err as { code?: string }).code === "P2002") continue;
        throw err;
      }
    }
    throw new Error("Could not assign a version number after several attempts");
  } catch (err) {
    // 3. The write failed after we charged — refund so credits aren't lost.
    // No-op when we never charged (credit economy disabled).
    if (charge) {
      await prisma.band.update({
        where: { id: project.bandId },
        data: { credits: { increment: UPLOAD_COST } },
      });
    }
    throw err;
  }
}

/**
 * Backfill waveform peaks for a version uploaded before peaks were stored
 * (issue #6). Called fire-and-forget by the Waveform component after it
 * successfully decodes such a version in the browser, so old songs start
 * rendering on mobile once any band member views them on a capable device.
 *
 * Deliberately narrow: only band members may write, only while `peaks` is
 * still null (write-once — the conditional update also makes races harmless),
 * and the payload must pass the same sanitizer as uploads.
 */
export async function saveWaveform(input: { versionId: string; peaks: number[] }) {
  const gate = await requireVerifiedUser();
  if (!gate.ok) return { error: gate.error, code: gate.code };
  const user = gate.user;

  const peaks = sanitizePeaks(input.peaks);
  if (!peaks) return { error: "Invalid peaks" };

  const version = await prisma.songVersion.findUnique({
    where: { id: input.versionId },
    select: {
      peaks: true,
      project: {
        select: { id: true, bandId: true, slug: true, band: { select: { username: true } } },
      },
    },
  });
  if (!version) return { error: "Version not found" };
  if (version.peaks) return { ok: true }; // already stored

  const role = await getMembership(version.project.bandId, user.id);
  if (!isMember(role)) return { error: "Not allowed" };

  await prisma.songVersion.updateMany({
    where: { id: input.versionId, peaks: null },
    data: { peaks: serializePeaks(peaks) },
  });

  revalidatePath(`/dashboard/${version.project.id}`);
  revalidatePath(`/${version.project.band.username}/${version.project.slug}`);
  return { ok: true };
}
