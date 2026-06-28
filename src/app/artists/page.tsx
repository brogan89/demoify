import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata: Metadata = {
  title: "Artists · Demoify",
  description: "Find bands and artists on Demoify.",
};

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: qParam } = await searchParams;
  const q = (qParam ?? "").trim();

  const bands = await prisma.band.findMany({
    where: q
      ? {
          OR: [{ displayName: { contains: q } }, { username: { contains: q } }],
        }
      : {},
    orderBy: { displayName: "asc" },
    take: 50,
    select: { username: true, displayName: true, avatarUrl: true, bio: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Artists</h1>
        <p className="text-sm text-muted-foreground">Find bands and artists on Demoify.</p>
      </div>

      <form action="/artists" className="relative mb-6">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search artists…"
          className="pl-8"
          aria-label="Search artists"
        />
      </form>

      {bands.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q ? "No artists match this search." : "No artists yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {bands.map((band) => (
            <li key={band.username}>
              <Link
                href={`/${band.username}`}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Avatar className="size-12">
                  {band.avatarUrl && <AvatarImage src={band.avatarUrl} alt="" />}
                  <AvatarFallback>{initials(band.displayName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{band.displayName}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    demoify.app/{band.username}
                  </p>
                  {band.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{band.bio}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
