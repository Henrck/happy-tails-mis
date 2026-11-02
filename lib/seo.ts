// The canonical URL must be the public, production website, not a Vercel preview URL.
// Set SITE_URL in Vercel only when the production hostname differs from this default.
const DEFAULT_SITE_URL = "https://happytailspgc.vercel.app";

function resolveSiteUrl(): string {
  const configured = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (!configured) return DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return DEFAULT_SITE_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl();
export const IS_PREVIEW_DEPLOYMENT = process.env.VERCEL_ENV === "preview";
