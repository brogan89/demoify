import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { SongCard } from "@/components/song-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Explore · Demoify",
  description: "A feed of works-in-progress from bands on Demoify.",
};

type Sort = "recent" | "popular";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>;
}) {
  const { sort: sortParam, q: qParam } = await searchParams;
  const sort: Sort = sortParam === "popular" ? "popular" : "recent";
  const q = (qParam ?? "").trim();
  const user = await getCurrentUser();
  // Empty id matches no rows, so logged-out users get liked=false everywhere.
  const viewerId = user?.id ?? "";

  const songs = await prisma.songProject.findMany({
    where: {
      visibility: "PUBLIC",
      versions: { some: {} },
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
          <SortTab current={sort} value="recent" label="Recent" q={q} />
          <SortTab current={sort} value="popular" label="Popular" q={q} />
        </div>
      </div>

      <form action="/explore" className="relative mb-6">
        {/* Preserve the active sort when submitting a search. */}
        <input type="hidden" name="sort" value={sort} />
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

      {songs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q ? `No public songs match "${q}".` : "No public songs yet."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((s) => (
            <li key={s.id}>
              <SongCard
                song={{
                  id: s.id,
                  title: s.title,
                  slug: s.slug,
                  playCount: s.playCount,
                  likeCount: s._count.likes,
                  liked: s.likes.length > 0,
                  band: s.band,
                }}
                isAuthed={Boolean(user)}
              />
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
}: {
  current: Sort;
  value: Sort;
  label: string;
  q: string;
}) {
  const active = current === value;
  const params = new URLSearchParams({ sort: value });
  if (q) params.set("q", q);
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
