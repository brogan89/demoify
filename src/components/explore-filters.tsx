"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { GENRE_NAMES, getSubgenres } from "@/lib/genres";

// Cascading genre/subgenre filter for the Explore page. Navigates on change,
// preserving the active sort and search query. A genre must be chosen before a
// subgenre filter is offered.
export function ExploreFilters({
  sort,
  q,
  genre,
  subgenre,
}: {
  sort: string;
  q: string;
  genre: string;
  subgenre: string;
}) {
  const router = useRouter();
  const subgenres = getSubgenres(genre);

  function navigate(nextGenre: string, nextSubgenre: string) {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (q) params.set("q", q);
    if (nextGenre) params.set("genre", nextGenre);
    if (nextSubgenre) params.set("subgenre", nextSubgenre);
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : "/explore");
  }

  return (
    <div className="flex gap-2">
      <Select
        className="w-40"
        aria-label="Filter by genre"
        value={genre}
        onChange={(e) => navigate(e.target.value, "")}
      >
        <option value="">All genres</option>
        {GENRE_NAMES.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </Select>
      {subgenres.length > 0 && (
        <Select
          className="w-40"
          aria-label="Filter by subgenre"
          value={subgenre}
          onChange={(e) => navigate(genre, e.target.value)}
        >
          <option value="">All subgenres</option>
          {subgenres.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
