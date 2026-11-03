import { createClient } from "@/lib/supabase/server";
import HappyTailsSignup from "./SignupClient";
import "../forgot-password/forgot-password.css";
import "./sign-up.css";

export const dynamic = "force-dynamic";

const DEFAULT_LANDSCAPE = "/images/happytails-login-landscape.webp";
const DEFAULT_PORTRAIT = "/images/happytails-login-portrait-top.webp";

function safeImageUrl(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const url = value.trim();
  return ((url.startsWith("/") && !url.startsWith("//")) || url.startsWith("https://")) ? url : fallback;
}

export default async function SignUpPage() {
  let landscapeUrl = DEFAULT_LANDSCAPE;
  let portraitUrl = DEFAULT_PORTRAIT;
  let customPortrait = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_settings")
      .select("key, image_url")
      .in("key", ["login_background_desktop", "login_background_mobile"]);
    if (!error && data) {
      landscapeUrl = safeImageUrl(data.find(s => s.key === "login_background_desktop")?.image_url, DEFAULT_LANDSCAPE);
      portraitUrl = safeImageUrl(data.find(s => s.key === "login_background_mobile")?.image_url, DEFAULT_PORTRAIT);
      customPortrait = portraitUrl !== DEFAULT_PORTRAIT;
    }
  } catch {
    // Branding must not prevent registration when site settings are unavailable.
  }
  return <HappyTailsSignup landscapeUrl={landscapeUrl} portraitUrl={portraitUrl} customPortrait={customPortrait} />;
}
