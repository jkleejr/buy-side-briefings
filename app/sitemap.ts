import type { MetadataRoute } from "next";
import { getAllBriefings } from "@/lib/data";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    "",
    "/briefings",
    "/digest",
    "/track-record",
    "/watchlist",
    "/crypto",
    "/metals",
    "/about",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "" ? 1.0 : 0.7,
  }));

  const briefingRoutes = getAllBriefings().map((b) => ({
    url: `${base}/briefings/${b.routine}/${b.slug}`,
    lastModified: b.generated_at ? new Date(b.generated_at) : now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...briefingRoutes];
}
