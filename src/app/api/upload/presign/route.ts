import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/session";
import { getMembership, canManageSongs } from "@/lib/band";
import { prisma } from "@/lib/db";
import { isR2Configured, r2, R2_BUCKET, publicUrlFor } from "@/lib/r2";
import { UPLOAD_COST } from "@/lib/credits";

const ALLOWED_AUDIO = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"]);
const ALLOWED_IMAGE = new Set(["image/png", "image/jpeg", "image/webp"]);

function extFor(contentType: string, fileName: string): string {
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav") || contentType.includes("wave")) return "wav";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  const m = fileName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}

async function presignTo(key: string, contentType: string) {
  const uploadUrl = await getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 600 },
  );
  return NextResponse.json({ uploadUrl, key, publicUrl: publicUrlFor(key) });
}

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Uploads are not configured. Set R2_* environment variables." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { kind, contentType, fileName } = body as {
    kind?: "song" | "logo";
    contentType?: string;
    fileName?: string;
  };
  if (!contentType || !fileName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Artist logo: an image gated on band-manage rights, no credit cost.
  if (kind === "logo") {
    const bandId = body.bandId as string | undefined;
    if (!bandId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!ALLOWED_IMAGE.has(contentType)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG or WebP images are allowed" },
        { status: 415 },
      );
    }
    const role = await getMembership(bandId, user.id);
    if (!canManageSongs(role)) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    return presignTo(`logos/${bandId}/${randomUUID()}.${extFor(contentType, fileName)}`, contentType);
  }

  // Default: a song version (audio), charged against the band's credits.
  const projectId = body.projectId as string | undefined;
  if (!projectId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!ALLOWED_AUDIO.has(contentType)) {
    return NextResponse.json({ error: "Only MP3 or WAV files are allowed" }, { status: 415 });
  }

  const project = await prisma.songProject.findUnique({
    where: { id: projectId },
    select: { bandId: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const role = await getMembership(project.bandId, user.id);
  if (!canManageSongs(role)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  // Fail before the upload if the band's balance can't cover it. Credits are
  // actually charged atomically when the version is created (see createVersion).
  const band = await prisma.band.findUnique({
    where: { id: project.bandId },
    select: { credits: true },
  });
  if (!band || band.credits < UPLOAD_COST) {
    return NextResponse.json(
      { error: `Not enough credits. Each upload costs ${UPLOAD_COST} credits.`, code: "INSUFFICIENT_CREDITS" },
      { status: 402 },
    );
  }

  return presignTo(`songs/${projectId}/${randomUUID()}.${extFor(contentType, fileName)}`, contentType);
}
