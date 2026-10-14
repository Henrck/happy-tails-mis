"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

const options: { label: string; key: SiteSettingKey; fallback: string }[] = [
  { label: "Dog Avatar", key: "pet_avatar_dog_male", fallback: "/images/pets/pet-dog.jpg" },
  { label: "Cat Avatar", key: "pet_avatar_cat_male", fallback: "/images/pets/pet-cat.jpg" },
];
export default function PetAvatarsManager({ settings, onChanged, onClose }: {
  settings: SiteSetting[]; onChanged: () => Promise<void>; onClose: () => void;
}) {
  const [active, setActive] = useState<SiteSettingKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !active) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5 MB or less."); return; }
    setSaving(true); setError("");
    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(file);
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Invalid image."));
        img.src = objectUrl!;
      });
      const db = createClient();
      const suffix = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${active}-${Date.now()}.${suffix}`;
      const { error: uploadError } = await db.storage.from("site-images").upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const url = db.storage.from("site-images").getPublicUrl(path).data.publicUrl;
      const { data, error: saveError } = await db.from("site_settings").update({ image_url: url, image_width: dimensions.width, image_height: dimensions.height, updated_at: new Date().toISOString() }).eq("key", active).select("key");
      if (saveError) throw saveError;
      if (!data?.length) throw new Error("Avatar setting row not found in Supabase. Confirm existing site_settings keys.");
      await onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); }
    finally { if (objectUrl) URL.revokeObjectURL(objectUrl); setSaving(false); setActive(null); }
  }
  return (
    <div role="presentation" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Configure Pet Avatars" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-bold text-slate-800">Configure Pet Avatars</h2><button type="button" onClick={onClose} disabled={saving} className="text-sm font-semibold text-slate-500">Close</button></div>
        <p className="mt-2 text-sm text-slate-500">Upload one default image for dogs and one for cats. Avatars appear in a circle across pet cards and profiles.</p>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
        <div className="mt-5 space-y-3">{options.map(({ label, key, fallback }) => (
          <div key={key} className="flex items-center gap-4 rounded-2xl border border-pink-100 p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-pink-50"><img src={settings.find(s => s.key === key)?.image_url || fallback} alt={label} className="h-full w-full object-cover object-center" /></div>
            <span className="flex-1 text-sm font-semibold text-slate-800">{label}</span>
            <button type="button" disabled={saving} onClick={() => { setActive(key); input.current?.click(); }} className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink hover:bg-pink-50 disabled:opacity-50">Change</button>
          </div>
        ))}</div>
        {saving && <p className="mt-4 text-sm text-brand-pink">Uploading avatar...</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
