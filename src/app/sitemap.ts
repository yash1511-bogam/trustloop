import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://trustloop.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${appUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
      images: [`${appUrl}/social-preview.svg`],
    },
    {
      url: `${appUrl}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/register`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${appUrl}/forgot-access`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${appUrl}/dashboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.4,
    },
    {
      url: `${appUrl}/settings`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${appUrl}/executive`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.3,
    },
  ];
}
