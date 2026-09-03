import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

/**
 * Every publicly reachable page. Kept as an explicit list rather than a
 * filesystem scan so that adding a page is a deliberate decision about
 * whether it should be indexed — and so nothing behind auth can leak in by
 * accident.
 *
 * The /tools calculators are the SEO surface: each answers a question people
 * actually search for, and each one ends at a signup.
 */
const MARKETING = ["", "/mission", "/rules", "/learn", "/docs"];
const TOOLS = [
  "/tools/mortgage",
  "/tools/debt-calculator",
  "/tools/compound-interest",
  "/tools/emergency-fund",
  "/tools/home-affordability",
  "/tools/car-affordability",
  "/tools/down-payment",
  "/tools/50-30-20",
];
const AUTH = ["/login", "/signup"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return [
    ...MARKETING.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.8,
    })),
    ...TOOLS.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...AUTH.map((path) => ({
      url: `${base}${path}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
