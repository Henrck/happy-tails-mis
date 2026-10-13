import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import HappyTailsLogin from "@/components/auth/HappyTailsLogin";
import "./login.css";

// Branding is editable in Supabase; never freeze the image URLs at build time.
export const dynamic = "force-dynamic";

const DEFAULT_LANDSCAPE = "/images/happytails-login-landscape.webp";
const DEFAULT_PORTRAIT = "/images/happytails-login-portrait-top.webp";

function safeImageUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const url = value.trim();
  if ((url.startsWith("/") && !url.startsWith("//")) || url.startsWith("https://")) return url;
  return fallback;
}

export default async function SignInPage() {
  let landscapeUrl = DEFAULT_LANDSCAPE;
  let portraitUrl = DEFAULT_PORTRAIT;
  let customPortrait = false;

  try {
    // site_settings is also used by the public homepage. A failed settings
    // query must never block the login page: locally bundled art is the fallback.
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings")
      .select("key, image_url")
      .in("key", ["login_background_desktop", "login_background_mobile"]);
    if (!error && data) {
      const desktop = data.find((setting) => setting.key === "login_background_desktop")?.image_url;
      const mobile = data.find((setting) => setting.key === "login_background_mobile")?.image_url;
      landscapeUrl = safeImageUrl(desktop, DEFAULT_LANDSCAPE);
      portraitUrl = safeImageUrl(mobile, DEFAULT_PORTRAIT);
      customPortrait = portraitUrl !== DEFAULT_PORTRAIT;
    }
  } catch { /* preserve access to sign-in during a settings/database outage */ }

  return (
    <Suspense fallback={null}>
      <HappyTailsLogin
        landscapeUrl={landscapeUrl}
        portraitUrl={portraitUrl}
        customPortrait={customPortrait}
      />
    </Suspense>
  );
}
