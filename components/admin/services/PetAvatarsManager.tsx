"use client";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

const avatars: { key: SiteSettingKey; name: string; fallback: string }[] = [
  { key: "pet_avatar_dog_male", name: "Dog Avatar", fallback: "/images/pets/pet-dog.jpg" },
  { key: "pet_avatar_cat_male", name: "Cat Avatar", fallback: "/images/pets/pet-cat.jpg" },
];

export default function PetAvatarsManager({ settings, onEdit, onClose }: {
  settings: SiteSetting[];
  onEdit: (key: SiteSettingKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="pet-avatar-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="pet-avatar-title" className="text-xl font-bold text-zinc-800">Pet Avatar Settings</h2>
            <p className="mt-1 text-sm text-zinc-500">Choose one default image for dogs and one for cats. These will appear in circular pet avatars throughout the customer interface.</p>
          </div>
          <button type="button" aria-label="Close pet avatar settings" onClick={onClose} className="rounded-full px-2 py-1 text-xl text-zinc-500 hover:bg-zinc-100">×</button>
        </div>
        <div className="mt-6 space-y-3">
          {avatars.map((avatar) => {
            const source = settings.find((item) => item.key === avatar.key)?.image_url || avatar.fallback;
            return (
              <div key={avatar.key} className="flex items-center gap-4 rounded-2xl border border-pink-100 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-pink-50 ring-1 ring-pink-100">
                  <img src={source} alt={`${avatar.name} preview`} className="h-full w-full object-cover object-center" />
                </div>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-zinc-800">{avatar.name}</p><p className="mt-0.5 text-xs text-zinc-500">Displayed automatically for all {avatar.name.startsWith("Dog") ? "dogs" : "cats"}</p></div>
                <button type="button" onClick={() => onEdit(avatar.key)} className="rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink hover:bg-pink-50">Change</button>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-xs text-zinc-500">Tip: Upload square images (for example, 512 × 512 px) with the animal centered for the best crop.</p>
      </div>
    </div>
  );
}
