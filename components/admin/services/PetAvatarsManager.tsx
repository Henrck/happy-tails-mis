"use client";
// Configuration screen for automatic pet avatars — reached via the
// "Configure Pet Avatars" button on Service Management. Uses the same
// upload mechanism as Website Management (site-images storage bucket +
// site_settings row per key) so uploading here works exactly the same
// way admin already knows from managing website photos.
import Image from "next/image";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

const rows: { key: SiteSettingKey; label: string; defaultImage: string }[] = [
  { key: "pet_avatar_dog_male", label: "Dog (Male)", defaultImage: "/images/pets/dog-male.jpg" },
  { key: "pet_avatar_dog_female", label: "Dog (Female)", defaultImage: "/images/pets/dog-female.jpg" },
  { key: "pet_avatar_cat_male", label: "Cat (Male)", defaultImage: "/images/pets/cat-male.jpg" },
  { key: "pet_avatar_cat_female", label: "Cat (Female)", defaultImage: "/images/pets/cat-female.jpg" },
];

export default function PetAvatarsManager({
  settings,
  onEdit,
  onClose,
}: {
  settings: SiteSetting[];
  onEdit: (key: SiteSettingKey) => void;
  onClose: () => void;
}) {
  const get = (key: SiteSettingKey) => settings.find((s) => s.key === key);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-brand-pink flex-1">Pet Avatars</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold">
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          Every registered pet automatically gets one of these images based on species and sex — customers never
          have to upload a pet photo themselves.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((row) => {
            const src = get(row.key)?.image_url || row.defaultImage;
            return (
              <div key={row.key} className="flex items-center gap-3 rounded-2xl border-2 border-brand-tint p-2.5">
                <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-brand-tint">
                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                </div>
                <p className="flex-1 text-sm font-semibold text-zinc-700">{row.label}</p>
                <button
                  onClick={() => onEdit(row.key)}
                  className="shrink-0 text-xs font-semibold text-brand-pink border-2 border-brand-pink rounded-full px-4 py-1.5 hover:bg-brand-pink hover:text-white transition-colors"
                >
                  Change
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
