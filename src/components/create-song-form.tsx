"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { GENRE_NAMES, getSubgenres } from "@/lib/genres";
import { createProject } from "@/app/actions/projects";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating…" : "Create song"}
    </Button>
  );
}

export function CreateSongForm() {
  const [title, setTitle] = useState("");
  // Subgenre options depend on the chosen genre; reset subgenre when genre changes.
  const [genre, setGenre] = useState("");
  const subgenres = getSubgenres(genre);
  return (
    <form action={createProject} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Song Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} placeholder="A short note…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="genre">Genre (optional)</Label>
          <Select
            id="genre"
            name="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option value="">No genre</option>
            {GENRE_NAMES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subgenre">Subgenre (optional)</Label>
          <Select id="subgenre" name="subgenre" disabled={subgenres.length === 0}>
            <option value="">No subgenre</option>
            {subgenres.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <SubmitButton />
    </form>
  );
}
