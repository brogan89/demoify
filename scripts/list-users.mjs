// Lists signed-up users with a bit of context (song count, credits, join date).
// Run via `just users`. Queries Postgres directly so it needs no build step.
import "dotenv/config";
import pg from "pg";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set — copy .env.example to .env (or run `just env`).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

try {
  await client.connect();
} catch (err) {
  console.error(`Could not connect to the database at ${DATABASE_URL}`);
  console.error("Is it running? Start it with `just db`.");
  console.error(String(err?.message ?? err));
  process.exit(1);
}

let rows;
try {
  ({ rows } = await client.query(`
    SELECT u.username,
           u."displayName"        AS name,
           u.email,
           u.credits,
           u."createdAt"          AS joined,
           COUNT(p.id)::int       AS songs
    FROM "user" u
    LEFT JOIN "song_project" p ON p."ownerId" = u.id
    GROUP BY u.id
    ORDER BY u."createdAt" ASC
  `));
} catch (err) {
  if (err?.code === "42P01") {
    console.error("The `user` table doesn't exist yet — run migrations with `just migrate`.");
  } else {
    console.error("Query failed:", String(err?.message ?? err));
  }
  await client.end();
  process.exit(1);
}

await client.end();

if (rows.length === 0) {
  console.log("No users have signed up yet.");
  process.exit(0);
}

console.log(`${rows.length} user${rows.length === 1 ? "" : "s"}:\n`);
console.table(
  rows.map((r) => ({
    user: `@${r.username}`,
    name: r.name,
    email: r.email,
    songs: r.songs,
    credits: r.credits,
    joined: new Date(r.joined).toISOString().slice(0, 10),
  })),
);
