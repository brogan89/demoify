import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@/generated/prisma/client";

// The Neon serverless driver talks to Postgres over WebSocket. Cloudflare
// Workers provide a global `WebSocket`; Node (local dev, migrations, scripts)
// does not, so fall back to the `ws` package there.
if (typeof WebSocket === "undefined") {
  // Lazy require so the `ws` dependency is never pulled into the Worker bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
