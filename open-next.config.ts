import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext config. The app is mostly dynamic (auth, server actions,
// per-user pages), so no incremental/ISR cache is wired yet. To cache the
// public song pages later, add an R2 incremental cache override here.
export default defineCloudflareConfig();
