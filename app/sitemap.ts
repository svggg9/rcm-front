import type { MetadataRoute } from "next";

import { SITE_URL } from "./lib/config";

function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/catalog"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}