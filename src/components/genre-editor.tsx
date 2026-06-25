"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { GENRE_NAMES, getSubgenres } from "@/lib/genres";
import { setSongGenre } from "@/app/actions/projects";

export function GenreEditor({
  projectId,
  genre,
  subgenre,
}: {
  projectId: string;
  genre: string | null;
  subgenre: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Local state mirrors the saved value; both selects save on change.
  const [g, setG] = useState(genre ?? "");
  const [sub, setSub] = useState(subgenre ?? "");
  const subgenres = getSubgenres(g);

  function save(nextGenre: string, nextSubgenre: string) {
    startTransition(async () => {
      const res = await setSongGenre(projectId, nextGenre || null, nextSubgenre || null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Genre updated");
      router.refresh();
    });
  }

  function onGenreChange(value: string) {
    // Drop a subgenre that no longer belongs to the new genre.
    const nextSub = getSubgenres(value).includes(sub) ? sub : "";
    setG(value);
    setSub(nextSub);
    save(value, nextSub);
  }

  function onSubgenreChange(value: string) {
    setSub(value);
    save(g, value);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <Label htmlFor="edit-genre" className="text-xs text-muted-foreground">
          Genre
        </Label>
        <Select
          id="edit-genre"
          className="w-36"
          value={g}
          disabled={pending}
          onChange={(e) => onGenreChange(e.target.value)}
        >
          <option value="">No genre</option>
          {GENRE_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-subgenre" className="text-xs text-muted-foreground">
          Subgenre
        </Label>
        <Select
          id="edit-subgenre"
          className="w-36"
          value={sub}
          disabled={pending || subgenres.length === 0}
          onChange={(e) => onSubgenreChange(e.target.value)}
        >
          <option value="">No subgenre</option>
          {subgenres.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
