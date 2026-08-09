import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in and operator surfaces. None of these are reachable without a
      // session, so this is about not wasting crawl budget on redirects — the
      // access control is in the app, not here.
      disallow: ["/admin", "/dashboard", "/library", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
