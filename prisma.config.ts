import { defineConfig } from "prisma/config";

// The database is Cloudflare D1 (SQLite). Schema changes are applied with
// `wrangler d1 migrations` (SQL in ./migrations), not `prisma migrate`, so no
// datasource URL is needed here. Generate new migration SQL with:
//   npx prisma migrate diff --from-local-d1 --to-schema prisma/schema.prisma --script
export default defineConfig({
  schema: "prisma/schema.prisma",
});
