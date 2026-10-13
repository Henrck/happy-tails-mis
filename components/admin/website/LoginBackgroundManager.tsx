"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { SiteSettingKey } from "@/lib/supabase/site-settings";

type LoginKey = Extract<SiteSettingKey, "login_background_desktop" | "login_background_mobile">;
type BackgroundSetting = {
  key: LoginKey;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
};

const CONFIG: { key: LoginKey; title: string; hint: string; fallback: string; ratio: string }[] = [
  {
    key: "login_background_desktop",
    title: "Landscape / Desktop",
    hint: "Recommended 1672 × 941 (16:9). Use artwork WITHOUT an embedded login form.",
    fallback: "/images/happytails-login-landscape.webp",
    ratio: "16 / 9",
  },
  {
    key: "login_background_mobile",
    title: "Portrait / Mobile",
    hint: "Recommended 941 × 1672 (9:16). Use artwork WITHOUT an embedded login form.",
    fallback: "/images/happytails-login-portrait-preview.webp",
    ratio: "9 / 16",
  },
];

export default function LoginBackgroundManager() {
  const [settings, setSettings] = useState<BackgroundSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<LoginKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<LoginKey>("login_background_desktop");

  useEffect(() => {
    let alive = true;
    async function loadSettings() {
      const supabase = createClient();
      const { data, error: queryError } = await supabase.from("site_settings")
        .select("key,image_url,image_width,image_height")
        .in("key", CONFIG.map(({ key }) => key));
      if (!alive) return;
      if (queryError) setError(queryError.message);
      else setSettings((data || []) as BackgroundSetting[]);
      setLoading(false);
    }
    void loadSettings();
    return () => { alive = false; };
  }, []);

  function selectFile(key: LoginKey) {
    setTarget(key);
    setError(null);
    setMessage(null);
    fileInput.current?.click();
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Use a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("The maximum allowed file size is 12 MB.");
      return;
    }
    setUploading(target);
    setError(null);
    setMessage(null);
    const objectUrl = URL.createObjectURL(file);
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Could not read the image."));
        img.src = objectUrl;
      });
      if (target === "login_background_desktop" && dimensions.width <= dimensions.height) {
        throw new Error("Please select a landscape image for desktop.");
      }
      if (target === "login_background_mobile" && dimensions.height <= dimensions.width) {
        throw new Error("Please select a portrait image for mobile.");
      }

      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `login-backgrounds/${target}-${crypto.randomUUID()}.${ext}`;
      const { error: storageError } = await supabase.storage.from("site-images").upload(path, file, {
        upsert: false,
        contentType: file.type,
      });
      if (storageError) throw storageError;
      const { data: publicImage } = supabase.storage.from("site-images").getPublicUrl(path);
      const { data: changed, error: updateError } = await supabase.from("site_settings")
        .update({
          image_url: publicImage.publicUrl,
          image_width: dimensions.width,
          image_height: dimensions.height,
          updated_at: new Date().toISOString(),
        })
        .eq("key", target)
        .select("key,image_url,image_width,image_height")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!changed) throw new Error("Setting not found or update not permitted. Apply the included SQL migration and verify Supabase permissions.");
      setSettings((previous) => [
        ...previous.filter((item) => item.key !== target),
        changed as BackgroundSetting,
      ]);
      setMessage(`${target === "login_background_desktop" ? "Desktop" : "Mobile"} login background updated. Refresh the login page to see it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the background.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploading(null);
    }
  }

  async function useDefault(key: LoginKey) {
    setUploading(key);
    setMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: resetError } = await supabase.from("site_settings")
        .update({ image_url: null, image_width: null, image_height: null, updated_at: new Date().toISOString() })
        .eq("key", key).select("key,image_url,image_width,image_height").maybeSingle();
      if (resetError) throw resetError;
      if (!data) throw new Error("Setting not found or update not permitted.");
      setSettings((old) => [...old.filter((setting) => setting.key !== key), data as BackgroundSetting]);
      setMessage("Original HappyTails background restored.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore the default.");
    } finally { setUploading(null); }
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <p className="text-sm text-zinc-500"><Link href="/admin/website-management" className="text-brand-pink hover:underline">Website Management</Link> / Login Page</p>
          <h1 className="mt-1 text-3xl font-bold text-brand-pink">Login Page Backgrounds</h1>
          <p className="mt-2 text-sm text-zinc-600">Change the desktop and mobile backgrounds without editing code. The login fields remain interactive HTML.</p>
        </div>
        <Link href="/sign-in" target="_blank" rel="noopener noreferrer" className="rounded-full border-2 border-brand-pink px-5 py-2 font-semibold text-brand-pink hover:bg-brand-tint">Preview Login ↗</Link>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-green-700">{message}</div>}
      {loading ? <p>Loading backgrounds...</p> : (
        <div className="grid items-start grid-cols-1 gap-6 xl:grid-cols-2">
          {CONFIG.map((config) => {
            const value = settings.find((setting) => setting.key === config.key);
            const isUploading = uploading === config.key;
            const image = value?.image_url || config.fallback;
            return (
              <section key={config.key} className="rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-800">{config.title}</h2>
                <p className="mt-1 text-sm text-zinc-500">{config.hint}</p>
                <div
                  role="img"
                  aria-label={`${config.title} background preview`}
                  className="mx-auto mt-5 max-h-[480px] w-full rounded-2xl border border-pink-200 bg-[#fae7ef] bg-contain bg-center bg-no-repeat"
                  style={{ aspectRatio: config.ratio, backgroundImage: `url(${JSON.stringify(image)})` }}
                />
                <p className="mt-3 text-xs text-zinc-500">
                  {value?.image_url ? `Custom image (${value.image_width || '?'} × ${value.image_height || '?'})` : "Using original HappyTails artwork"}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => selectFile(config.key)}
                    disabled={uploading !== null}
                    className="rounded-full bg-brand-pink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-pink-dark disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload New Background"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void useDefault(config.key)}
                    disabled={uploading !== null || !value?.image_url}
                    className="rounded-full border border-pink-300 px-5 py-2.5 text-sm font-bold text-brand-pink disabled:opacity-40"
                  >
                    Restore Original
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="hidden" aria-label="Select login background image" onChange={(event) => void upload(event)} />
      <p className="text-sm text-zinc-500">Only a Superadmin should manage these settings. Images use the existing Supabase <code>site-images</code> storage bucket and <code>site_settings</code> table. Google sign-in is displayed as unavailable until its OAuth flow is configured.</p>
    </div>
  );
}
