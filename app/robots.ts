import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

/**
 * The marketing pages and the free calculators under /tools are the whole
 * top of the funnel, so crawlers are welcome there. Everything behind auth
 * is not — it would only ever return a login redirect anyway, and there's no
 * reason to spend crawl budget on it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/dashboard/", "/capture", "/api/", "/openapi"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
