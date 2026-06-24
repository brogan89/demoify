import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Prisma's engine packages unbundled so they use their workerd
  // entrypoints at runtime. See https://opennext.js.org/cloudflare/howtos/workerd
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
};

export default nextConfig;

// Make Cloudflare bindings (Hyperdrive, etc.) available under `next dev`.
// No-op in production builds. Safe to leave un-awaited per OpenNext docs.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
