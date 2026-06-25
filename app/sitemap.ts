import type { MetadataRoute } from "next";
import {
  getAllBriefings,
  getAllOpportunities,
  getAllOpportunitySnapshots,
} from "@/lib/data";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticRoutes = [
    "",
    "/briefings",
    "/opportunities",
    "/digest",
    "/track-record",
    "/watchlist",
    "/crypto",
    "/markets",
    "/macro",
    "/earnings",
    "/global",
    "/sectors",
    "/pulse",
    "/bitcoin",
    "/nvidia",
    "/micron",
    "/nebius",
    "/bloom-energy",
    "/coreweave",
    "/kospi",
    "/skhynix",
    "/spacex",
    "/situational-awareness",
    "/metals",
    "/indices",
    "/tech",
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

  const opportunityRoutes = getAllOpportunities().map((o) => ({
    url: `${base}/opportunities/${o.id}`,
    lastModified: new Date(o.created_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const snapshotRoutes = [
    {
      url: `${base}/opportunities/history`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
    ...getAllOpportunitySnapshots().map((s) => ({
      url: `${base}/opportunities/history/${s.date}`,
      lastModified: new Date(s.generated_at),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  return [...staticRoutes, ...briefingRoutes, ...opportunityRoutes, ...snapshotRoutes];
}
