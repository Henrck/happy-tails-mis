import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only public, customer-facing pages belong in the searchable sitemap.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/` },
    { url: `${SITE_URL}/gallery` },
    { url: `${SITE_URL}/products` },
  ];
}
