"use client";
// Website Management: replace the background image for each editable
// section. Upload flow: file -> Supabase Storage ("site-images" bucket)
// -> get its public URL -> update the matching site_settings row. The
// public pages read from site_settings (see app/page.tsx), so a change
// here goes live immediately, no redeploy needed.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SITE_SETTING_LABELS, type SiteSetting, type SiteSettingKey } from "@/lib/supabase/site-settings";

export default function WebsiteManagementPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<SiteSettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) {
        setError(error.message);
      } else {
        setSettings((data as SiteSetting[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleUpload(key: SiteSettingKey, file: File) {
    setUploadingKey(key);
    setError(null);
    const supabase = createClient();

    // Capture the real image dimensions before uploading, so banners that
    // rely on knowing intrinsic size (to avoid cropping — see
    // PhotoBanner.tsx) still work correctly with a dynamically uploaded
    // photo, not just the bundled defaults.
    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = URL.createObjectURL(file);
    });

    const ext = file.name.split(".").pop();
    const path = `${key}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploadingKey(null);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("site-images").getPublicUrl(path);
    const newUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        image_url: newUrl,
        image_width: dimensions.width,
        image_height: dimensions.height,
        updated_at: new Date().toISOString(),
      })
      .eq("key", key);

    if (updateError) {
      setError(`Saved the file, but couldn't update the site record: ${updateError.message}`);
      setUploadingKey(null);
      return;
    }

    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height } : s))
    );
    setUploadingKey(null);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/operations")}
          aria-label="Back"
          className="w-9 h-9 rounded-full bg-white border border-pink-200 flex items-center justify-center text-zinc-600 hover:border-brand-pink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-brand-pink">Website Management</h1>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-zinc-400">Loading current settings...</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.map((setting) => (
            <div key={setting.key} className="bg-white rounded-2xl border border-pink-100 p-4">
              <h3 className="font-semibold text-zinc-800">{SITE_SETTING_LABELS[setting.key as SiteSettingKey]}</h3>

              <div className="mt-3 relative w-full aspect-video rounded-xl overflow-hidden bg-brand-tint">
                {setting.image_url && (
                  <Image src={setting.image_url} alt={SITE_SETTING_LABELS[setting.key as SiteSettingKey]} fill className="object-cover" unoptimized />
                )}
              </div>

              <label className="mt-3 flex items-center justify-center gap-2 border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors cursor-pointer">
                {uploadingKey === setting.key ? "Uploading..." : "Replace Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingKey !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(setting.key as SiteSettingKey, file);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
