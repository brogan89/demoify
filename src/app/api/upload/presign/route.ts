import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { isR2Configured, r2, R2_BUCKET, publicUrlFor } from "@/lib/r2";
import { UPLOAD_COST } from "@/lib/credits";

const ALLOWED = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"]);

function extFor(contentType: string, fileName: string): string {
  if (contentType.includes("mpeg")) return "mp3";
  if (contentType.includes("wav") || contentType.includes("wave")) return "wav";
  const m = fileName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
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

  const { projectId, contentType, fileName } = await req.json().catch(() => ({}));
  if (!projectId || !contentType || !fileName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: "Only MP3 or WAV files are allowed" }, { status: 415 });
  }

  const project = await prisma.songProject.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fail before the upload if the balance can't cover it. Credits are actually
  // charged atomically when the version is created (see createVersion).
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });
  if (!account || account.credits < UPLOAD_COST) {
    return NextResponse.json(
      { error: `Not enough credits. Each upload costs ${UPLOAD_COST} credits.`, code: "INSUFFICIENT_CREDITS" },
      { status: 402 },
    );
  }

  const key = `songs/${projectId}/${randomUUID()}.${extFor(contentType, fileName)}`;
  const uploadUrl = await getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: 600 },
  );

  return NextResponse.json({ uploadUrl, key, publicUrl: publicUrlFor(key) });
}
