import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma operations that mutate data. When dev is pointed at the production D1
// (DEV_REMOTE_DB=1, via `npm run dev:remote`) these are blocked so testing
// can't change real data. Reads (findMany, $queryRaw, …) pass through.
const WRITE_OPS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
  "$executeRaw",
  "$executeRawUnsafe",
]);

/**
 * Build the Prisma client against the Cloudflare D1 binding. `getCloudflareContext()`
 * is only valid inside a request, so this runs lazily on first use (never at module
 * load). Under `next dev` the binding is provided by `initOpenNextCloudflareForDev()`
 * (local D1 emulation); in production it's the `DB` binding from wrangler.jsonc.
 */
function createClient(): PrismaClient {
  const { env } = getCloudflareContext();
  const db = (env as { DB?: D1Database }).DB;
  if (!db) throw new Error("D1 binding 'DB' not found — check wrangler.jsonc.");
  const adapter = new PrismaD1(db);
  const client = new PrismaClient({ adapter });

  // Read-only guard for dev-against-production (see `npm run dev:remote`).
  if (process.env.DEV_REMOTE_DB === "1") {
    return client.$extends({
      query: {
        $allOperations({ model, operation, args, query }) {
          if (WRITE_OPS.has(operation)) {
            throw new Error(
              `[dev:remote] Write blocked — connected to production D1 (read-only). ` +
                `Attempted ${model ?? "raw"}.${operation}.`,
            );
          }
          return query(args);
        },
      },
    }) as unknown as PrismaClient;
  }

  return client;
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

// Lazy proxy so importing `prisma` never touches the Cloudflare context at
// module-eval time; the real client is created on first method call.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;
