import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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
  return new PrismaClient({ adapter });
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
