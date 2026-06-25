// Curated genre + subgenre taxonomy for songs. A fixed, hand-picked set (not
// free text) so the Explore filter and the create/edit dropdowns stay in sync
// and the stored values are predictable. SongProject.genre / .subgenre hold the
// chosen labels verbatim (see prisma/schema.prisma). Keep labels stable —
// renaming one orphans existing rows that stored the old label.

export type Genre = {
  name: string;
  subgenres: string[];
};

export const GENRES: Genre[] = [
  {
    name: "Electronic",
    subgenres: ["House", "Techno", "Ambient", "Drum & Bass", "Synthwave", "IDM"],
  },
  {
    name: "Hip-Hop",
    subgenres: ["Boom Bap", "Trap", "Lo-Fi", "Drill", "Cloud Rap"],
  },
  {
    name: "Rock",
    subgenres: ["Indie", "Alternative", "Punk", "Garage", "Post-Rock", "Shoegaze"],
  },
  {
    name: "Pop",
    subgenres: ["Indie Pop", "Synth-Pop", "Dream Pop", "Electropop", "Bedroom Pop"],
  },
  {
    name: "R&B / Soul",
    subgenres: ["Contemporary R&B", "Neo-Soul", "Funk", "Motown"],
  },
  {
    name: "Jazz",
    subgenres: ["Bebop", "Fusion", "Smooth Jazz", "Swing", "Free Jazz"],
  },
  {
    name: "Folk / Acoustic",
    subgenres: ["Singer-Songwriter", "Americana", "Bluegrass", "Indie Folk"],
  },
  {
    name: "Metal",
    subgenres: ["Heavy Metal", "Death Metal", "Black Metal", "Doom", "Metalcore"],
  },
  {
    name: "Country",
    subgenres: ["Classic Country", "Alt-Country", "Outlaw", "Country Pop"],
  },
  {
    name: "Classical",
    subgenres: ["Orchestral", "Chamber", "Piano", "Choral", "Minimalism"],
  },
  {
    name: "Reggae",
    subgenres: ["Roots", "Dub", "Dancehall", "Ska"],
  },
  {
    name: "Experimental",
    subgenres: ["Noise", "Drone", "Field Recording", "Sound Collage"],
  },
];

/** The list of genre names, in display order. */
export const GENRE_NAMES: string[] = GENRES.map((g) => g.name);

/** Subgenres for a genre, or [] if the genre is null/unknown. */
export function getSubgenres(genre: string | null | undefined): string[] {
  if (!genre) return [];
  return GENRES.find((g) => g.name === genre)?.subgenres ?? [];
}

/**
 * Validate + clean a raw genre/subgenre pair (e.g. from FormData or a query
 * string). Returns null genre for empty/unknown input, and clears the subgenre
 * unless it actually belongs to the chosen genre. The single source of truth
 * for what gets stored or queried — reused by the create/edit actions and the
 * Explore filter.
 */
export function normalizeGenre(
  rawGenre: string | null | undefined,
  rawSubgenre: string | null | undefined,
): { genre: string | null; subgenre: string | null } {
  const genre = (rawGenre ?? "").trim();
  if (!genre || !GENRE_NAMES.includes(genre)) {
    return { genre: null, subgenre: null };
  }
  const subgenre = (rawSubgenre ?? "").trim();
  if (!subgenre || !getSubgenres(genre).includes(subgenre)) {
    return { genre, subgenre: null };
  }
  return { genre, subgenre };
}
