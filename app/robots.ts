import type { MetadataRoute } from "next";
import { IS_PREVIEW_DEPLOYMENT, SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (IS_PREVIEW_DEPLOYMENT) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/api",
        "/auth",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/verify-email",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
