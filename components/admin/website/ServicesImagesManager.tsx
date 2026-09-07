"use client";
// The Pet Services section has three separate photos (Grooming/Boarding/
// Spa) instead of the single image most other sections manage, so it
// needs its own small picker rather than EditableSection's one-button
// pattern. Reuses the SAME upload mechanism as everything else (passed
// down as `openUploadFor`) — this modal is just a chooser for which of
// the three keys to edit, not a separate upload implementation.
import Image from "next/image";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

const rows: { key: SiteSettingKey; label: string; defaultImage: string }[] = [
  { key: "services_grooming_image", label: "Grooming Photo", defaultImage: "/images/grooming-banner-bg.png" },
  { key: "services_boarding_image", label: "Boarding Photo", defaultImage: "/images/boarding-banner-bg.png" },
  { key: "services_spa_image", label: "Spa Photo", defaultImage: "/images/spa-banner-bg.png" },
];

export default function ServicesImagesManager({
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
          <h3 className="font-bold text-lg text-brand-pink flex-1">Pet Services Photos</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold">
            Close
          </button>
        </div>

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
