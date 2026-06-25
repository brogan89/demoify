import { prisma } from "@/lib/db";

/**
 * Federation lets a self-hosted instance ("client") submit its public tracks to
 * a central "hub" instance (e.g. demoify.app) so they appear in the hub's shared
 * Explore feed. Only metadata travels — audio keeps streaming from the client's
 * own storage. The same codebase fills both roles, selected by env vars:
 *
 *  - Client (push outward): FEDERATION_HUB_URL + FEDERATION_TOKEN.
 *  - Hub (accept + display):  FEDERATION_HUB_ENABLED=true.
 *
 * All client-side pushes are best-effort: failures are logged, never thrown, so
 * federation hiccups can't break a local upload or visibility change.
 */

/** The wire payload for a track submission (POST /api/federation/tracks). */
export type FederatedTrackPayload = {
  remoteId: string;
  title: string;
  artistName: string;
  artistUrl: string;
  trackUrl: string;
  audioUrl: string;
  genre: string | null;
  subgenre: string | null;
  playCount: number;
  likeCount: number;
};

/** Hex SHA-256 of a string (Web Crypto — works in both Workers and Node). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** True when this instance is configured to push its public tracks to a hub. */
export function federationClientEnabled(): boolean {
  return Boolean(process.env.FEDERATION_HUB_URL && process.env.FEDERATION_TOKEN);
}

/** True when this instance acts as a hub: accepts submissions and shows them in Explore. */
export function federationHubEnabled(): boolean {
  return process.env.FEDERATION_HUB_ENABLED === "true";
}

/** This instance's canonical public origin, used to build outbound links. */
function appOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function hubUrl(): string {
  return (process.env.FEDERATION_HUB_URL ?? "").replace(/\/$/, "");
}

/**
 * Push a public song to the configured hub. No-ops unless federation is enabled
 * and the project is PUBLIC with at least one uploaded version (nothing to play
 * otherwise). Best-effort: any error is logged and swallowed.
 */
export async function syncTrack(projectId: string): Promise<void> {
  if (!federationClientEnabled()) return;

  try {
    const project = await prisma.songProject.findUnique({
      where: { id: projectId },
      include: {
        band: { select: { username: true, displayName: true } },
        versions: { orderBy: { versionNumber: "desc" }, take: 1, select: { audioUrl: true } },
        _count: { select: { likes: true } },
      },
    });

    // Only public, playable songs belong on the hub. If it became unpublishable,
    // remove any existing mirror instead.
    if (!project || project.visibility !== "PUBLIC" || project.versions.length === 0) {
      await removeTrack(projectId);
      return;
    }

    const origin = appOrigin();
    const payload: FederatedTrackPayload = {
      remoteId: project.id,
      title: project.title,
      artistName: project.band.displayName,
      artistUrl: `${origin}/${project.band.username}`,
      trackUrl: `${origin}/${project.band.username}/${project.slug}`,
      audioUrl: project.versions[0].audioUrl,
      genre: project.genre,
      subgenre: project.subgenre,
      playCount: project.playCount,
      likeCount: project._count.likes,
    };

    const res = await fetch(`${hubUrl()}/api/federation/tracks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FEDERATION_TOKEN}`,
        "X-Instance-Url": origin,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Federation push failed", project.id, res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("Federation push error for project", projectId, err);
  }
}

/** Remove a track from the hub (on unpublish or delete). Best-effort. */
export async function removeTrack(remoteId: string): Promise<void> {
  if (!federationClientEnabled()) return;

  try {
    const res = await fetch(
      `${hubUrl()}/api/federation/tracks?remoteId=${encodeURIComponent(remoteId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.FEDERATION_TOKEN}`,
          "X-Instance-Url": appOrigin(),
        },
      },
    );
    if (!res.ok && res.status !== 404) {
      console.error("Federation delete failed", remoteId, res.status);
    }
  } catch (err) {
    console.error("Federation delete error for", remoteId, err);
  }
}
