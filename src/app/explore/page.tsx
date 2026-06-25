import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { SongCard, type SongCardData } from "@/components/song-card";
import { ExploreFilters } from "@/components/explore-filters";
import { normalizeGenre } from "@/lib/genres";
import { federationHubEnabled } from "@/lib/federation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explore · Demoify",
  description: "A feed of works-in-progress from bands on Demoify.",
};

type Sort = "recent" | "popular";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string; genre?: string; subgenre?: string }>;
}) {
  const { sort: sortParam, q: qParam, genre: genreParam, subgenre: subgenreParam } =
    await searchParams;
  const sort: Sort = sortParam === "popular" ? "popular" : "recent";
  const q = (qParam ?? "").trim();
  // Validate the filter against the curated taxonomy; an unknown genre clears
  // the filter, and a subgenre that doesn't belong to the genre is dropped.
  const { genre, subgenre } = normalizeGenre(genreParam, subgenreParam);
  const user = await getCurrentUser();
  // Empty id matches no rows, so logged-out users get liked=false everywhere.
  const viewerId = user?.id ?? "";

  const songs = await prisma.songProject.findMany({
    where: {
      visibility: "PUBLIC",
      versions: { some: {} },
      ...(genre ? { genre } : {}),
      ...(subgenre ? { subgenre } : {}),
      // Match the query against the song title or the band's name/handle.
      // SQLite `contains` (LIKE) is case-insensitive for ASCII.
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { band: { displayName: { contains: q } } },
              { band: { username: { contains: q } } },
            ],
          }
        : {}),
    },
    orderBy:
      sort === "popular"
        ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
        : { createdAt: "desc" },
    take: 50,
    include: {
      band: { select: { username: true, displayName: true } },
      _count: { select: { likes: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
    },
  });

  // Normalize local songs and (when this instance is a hub) approved federated
  // tracks into one list, sorted together and capped at 50. Federated tracks
  // link out to their origin instance — see SongCard.
  type Entry = { card: SongCardData; recentAt: number; likes: number };
  const localEntries: Entry[] = songs.map((s) => ({
    card: {
      id: s.id,
      title: s.title,
      slug: s.slug,
      playCount: s.playCount,
      likeCount: s._count.likes,
      liked: s.likes.length > 0,
      band: s.band,
    },
    recentAt: s.createdAt.getTime(),
    likes: s._count.likes,
  }));

  let externalEntries: Entry[] = [];
  if (federationHubEnabled()) {
    const external = await prisma.externalTrack.findMany({
      where: {
        status: "approved",
        ...(genre ? { genre } : {}),
        ...(subgenre ? { subgenre } : {}),
        ...(q
          ? { OR: [{ title: { contains: q } }, { artistName: { contains: q } }] }
          : {}),
      },
      orderBy:
        sort === "popular"
          ? [{ likeCount: "desc" }, { submittedAt: "desc" }]
          : { submittedAt: "desc" },
      take: 50,
      include: { instance: { select: { name: true } } },
    });
    externalEntries = external.map((t) => ({
      card: {
        id: t.id,
        title: t.title,
        slug: "",
        playCount: t.playCount,
        likeCount: t.likeCount,
        liked: false,
        band: { username: "", displayName: t.artistName },
        external: { trackUrl: t.trackUrl, artistUrl: t.artistUrl, originName: t.instance.name },
      },
      recentAt: t.submittedAt.getTime(),
      likes: t.likeCount,
    }));
  }

  const entries = [...localEntries, ...externalEntries]
    .sort((a, b) =>
      sort === "popular"
        ? b.likes - a.likes || b.recentAt - a.recentAt
        : b.recentAt - a.recentAt,
    )
    .slice(0, 50);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Explore</h1>
          <p className="text-sm text-muted-foreground">
            Works-in-progress from bands on Demoify.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border p-1 text-sm">
          <SortTab current={sort} value="recent" label="Recent" q={q} genre={genre} subgenre={subgenre} />
          <SortTab current={sort} value="popular" label="Popular" q={q} genre={genre} subgenre={subgenre} />
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form action="/explore" className="relative flex-1">
          {/* Preserve the active sort and genre filter when submitting a search. */}
          <input type="hidden" name="sort" value={sort} />
          {genre && <input type="hidden" name="genre" value={genre} />}
          {subgenre && <input type="hidden" name="subgenre" value={subgenre} />}
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search songs or bands…"
            className="pl-8"
            aria-label="Search songs or bands"
          />
        </form>
        <ExploreFilters sort={sort} q={q} genre={genre ?? ""} subgenre={subgenre ?? ""} />
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q || genre
            ? "No public songs match these filters."
            : "No public songs yet."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(({ card }) => (
            <li key={`${card.external ? "ext" : "loc"}-${card.id}`}>
              <SongCard song={card} isAuthed={Boolean(user)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SortTab({
  current,
  value,
  label,
  q,
  genre,
  subgenre,
}: {
  current: Sort;
  value: Sort;
  label: string;
  q: string;
  genre: string | null;
  subgenre: string | null;
}) {
  const active = current === value;
  const params = new URLSearchParams({ sort: value });
  if (q) params.set("q", q);
  if (genre) params.set("genre", genre);
  if (subgenre) params.set("subgenre", subgenre);
  return (
    <Link
      href={`/explore?${params.toString()}`}
      className={cn(
        "rounded-full px-3 py-1 transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
      )}
    >
      {label}
    </Link>
  );
}
