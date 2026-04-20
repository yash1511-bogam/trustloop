import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.yashbogam.me";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appUrl}/`,
      lastModified: "2026-04-20",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appUrl}/about`,
      lastModified: "2026-03-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/blog`,
      lastModified: "2026-04-20",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/changelog`,
      lastModified: "2026-04-20",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/contact-sales`,
      lastModified: "2026-03-15",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${appUrl}/security`,
      lastModified: "2026-03-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/status`,
      lastModified: "2026-04-20",
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${appUrl}/login`,
      lastModified: "2026-03-01",
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${appUrl}/register`,
      lastModified: "2026-03-01",
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${appUrl}/terms`,
      lastModified: "2026-02-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/privacy`,
      lastModified: "2026-02-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/dpa`,
      lastModified: "2026-02-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/billing-policy`,
      lastModified: "2026-02-01",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/docs`,
      lastModified: "2026-04-15",
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/docs/guides/getting-started`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/docs/guides/identity-and-access`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/docs/guides/incident-operations`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/docs/guides/integrations-and-ingestion`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/docs/guides/workspace-administration`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/docs/guides/billing-and-automation`,
      lastModified: "2026-04-15",
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
