import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeGenre } from "@/lib/genres";
import {
  federationHubEnabled,
  sha256Hex,
  type FederatedTrackPayload,
} from "@/lib/federation";

// Hub-side ingestion for federated tracks. Registered self-hosted instances
// POST their public tracks here and DELETE them on unpublish. Only active when
// this instance is configured as a hub (FEDERATION_HUB_ENABLED=true). Authn is a
// per-instance bearer token (we store only its SHA-256) plus an X-Instance-Url
// header identifying the origin.

const MAX_LEN = 300;

function normUrl(u: string | null): string {
  return (u ?? "").trim().replace(/\/$/, "");
}

/** Authenticate the caller against a registered FederatedInstance. */
async function authenticate(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const baseUrl = normUrl(req.headers.get("x-instance-url"));
  if (!token || !baseUrl) return null;

  const instance = await prisma.federatedInstance.findUnique({ where: { baseUrl } });
  if (!instance) return null;

  const tokenHash = await sha256Hex(token);
  // Length-prefixed equality is fine here — both sides are fixed-length hex digests.
  if (tokenHash !== instance.tokenHash) return null;

  return instance;
}

export async function POST(req: Request) {
  if (!federationHubEnabled()) {
    return NextResponse.json({ error: "Federation hub disabled" }, { status: 404 });
  }

  const instance = await authenticate(req);
  if (!instance) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as FederatedTrackPayload | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Required string fields, trimmed and length-clamped.
  const remoteId = String(body.remoteId ?? "").trim().slice(0, MAX_LEN);
  const title = String(body.title ?? "").trim().slice(0, MAX_LEN);
  const artistName = String(body.artistName ?? "").trim().slice(0, MAX_LEN);
  const artistUrl = normUrl(body.artistUrl);
  const trackUrl = normUrl(body.trackUrl);
  const audioUrl = String(body.audioUrl ?? "").trim();
  if (!remoteId || !title || !artistName || !artistUrl || !trackUrl || !audioUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // The site links must live on the submitting instance's origin (anti-spoofing).
  // audioUrl is exempt: audio is served from the instance's separate storage.
  if (!artistUrl.startsWith(instance.baseUrl) || !trackUrl.startsWith(instance.baseUrl)) {
    return NextResponse.json({ error: "Links must be on the instance origin" }, { status: 422 });
  }
  if (!/^https?:\/\//.test(audioUrl)) {
    return NextResponse.json({ error: "audioUrl must be an absolute URL" }, { status: 422 });
  }

  // Validate genre against the shared taxonomy; unknown values are dropped.
  const { genre, subgenre } = normalizeGenre(body.genre, body.subgenre);
  const playCount = Math.max(0, Math.trunc(Number(body.playCount) || 0));
  const likeCount = Math.max(0, Math.trunc(Number(body.likeCount) || 0));

  // Upsert. New tracks auto-approve only for trusted instances; otherwise they
  // land as "pending" for the operator to review. On update we deliberately
  // leave `status` untouched so a prior moderation decision stands.
  await prisma.externalTrack.upsert({
    where: { instanceId_remoteId: { instanceId: instance.id, remoteId } },
    create: {
      instanceId: instance.id,
      remoteId,
      title,
      artistName,
      artistUrl,
      trackUrl,
      audioUrl,
      genre,
      subgenre,
      playCount,
      likeCount,
      status: instance.trusted ? "approved" : "pending",
    },
    update: {
      title,
      artistName,
      artistUrl,
      trackUrl,
      audioUrl,
      genre,
      subgenre,
      playCount,
      likeCount,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!federationHubEnabled()) {
    return NextResponse.json({ error: "Federation hub disabled" }, { status: 404 });
  }

  const instance = await authenticate(req);
  if (!instance) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const remoteId = new URL(req.url).searchParams.get("remoteId")?.trim();
  if (!remoteId) return NextResponse.json({ error: "Missing remoteId" }, { status: 400 });

  const deleted = await prisma.externalTrack.deleteMany({
    where: { instanceId: instance.id, remoteId },
  });
  if (deleted.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
