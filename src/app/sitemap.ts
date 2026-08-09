import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteOrigin } from "@/lib/site";
import { LEGAL_ROUTES } from "@/lib/legal";

/**
 * Forced dynamic for two reasons, and the first is not optional: this queries
 * D1 through a Worker binding, which does not exist during `next build`. Left
 * to prerender, the build would fail outright. It also keeps newly published
 * songs in the sitemap without waiting on a redeploy.
 */
export const dynamic = "force-dynamic";

/**
 * Ceiling on song and artist entries.
 *
 * The sitemap spec caps a single file at 50,000 URLs, and there is no paging
 * here yet. Well above the current catalogue — revisit with generateSitemaps()
 * if the feed ever approaches it.
 */
const MAX_ENTRIES = 20_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${origin}/artists`, changeFrequency: "daily", priority: 0.7 },
    ...LEGAL_ROUTES.map((path) => ({
      url: `${origin}${path}`,
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];

  // Public songs with at least one uploaded version — the same condition
  // Explore uses, so the sitemap can't advertise a song that renders empty.
  // PRIVATE songs must never appear here: the sitemap is world-readable and
  // would leak both the title and the URL.
  const [songs, bands] = await Promise.all([
    prisma.songProject.findMany({
      where: { visibility: "PUBLIC", versions: { some: {} } },
      select: {
        slug: true,
        createdAt: true,
        band: { select: { username: true } },
        // Neither SongProject nor Band carries an `updatedAt`, and the honest
        // "last changed" signal for a song is when its newest take landed —
        // that is the event a crawler should come back for.
        versions: {
          orderBy: { uploadedAt: "desc" },
          take: 1,
          select: { uploadedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ENTRIES,
    }),
    prisma.band.findMany({
      where: { projects: { some: { visibility: "PUBLIC", versions: { some: {} } } } },
      select: { username: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_ENTRIES,
    }),
  ]);

  return [
    ...staticRoutes,
    ...bands.map((b) => ({
      url: `${origin}/${b.username}`,
      lastModified: b.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...songs.map((s) => ({
      url: `${origin}/${s.band.username}/${s.slug}`,
      lastModified: s.versions[0]?.uploadedAt ?? s.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
