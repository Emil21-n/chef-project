import type { MetadataRoute } from "next";

import { SITE_URL } from "@/shared/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      changeFrequency: "monthly",
      priority: 0.3
    }
  ];
}
