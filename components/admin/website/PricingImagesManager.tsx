"use client";

import Image from "next/image";
import type { SiteSetting, SiteSettingKey } from "@/lib/supabase/site-settings";

const rows: {
  key: SiteSettingKey;
  label: string;
  defaultImage: string;
}[] = [
  {
    key: "grooming_basic_image",
    label: "Grooming — Basic",
    defaultImage: "/images/pomeranian.png",
  },
  {
    key: "grooming_diamond_image",
    label: "Grooming — Diamond",
    defaultImage: "/images/pomeranian.png",
  },
  {
    key: "grooming_premium_image",
    label: "Grooming — Premium",
    defaultImage: "/images/poodle.png",
  },
  {
    key: "boarding_small_kennel_image",
    label: "Boarding — Small Kennel",
    defaultImage: "/images/small-kennel-dog.png",
  },
  {
    key: "boarding_big_kennel_image",
    label: "Boarding — Big Kennel",
    defaultImage: "/images/big-kennel-dog.png",
  },
];

export default function PricingImagesManager({
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-brand-pink">
              Grooming & Boarding Photos
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Change the photos displayed on the public pricing cards.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-600"
          >
            Close
          </button>
        </div>

        <div className="mt-5 flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          {rows.map((row) => {
            const src = get(row.key)?.image_url || row.defaultImage;

            return (
              <div
                key={row.key}
                className="flex items-center gap-3 rounded-2xl border-2 border-brand-tint p-2.5"
              >
                <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-tint">
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <p className="flex-1 text-sm font-semibold text-zinc-700">
                  {row.label}
                </p>

                <button
                  onClick={() => onEdit(row.key)}
                  className="shrink-0 rounded-full border-2 border-brand-pink px-4 py-1.5 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink hover:text-white"
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
