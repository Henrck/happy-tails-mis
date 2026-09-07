import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types/gallery";

function ZoomIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </svg>
  );
}

export default function GalleryCard({
  photo,
  onClick,
}: {
  photo: GalleryPhoto;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${photo.title || "before and after photos"} larger`}
      className="group w-full overflow-hidden rounded-2xl border-2 border-white bg-white text-left shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="relative grid grid-cols-2 gap-1 bg-pink-50 p-1">
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <Image
            src={photo.before_url}
            alt={`${photo.title ?? "Pet"} before`}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            Before
          </span>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <Image
            src={photo.after_url}
            alt={`${photo.title ?? "Pet"} after`}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-brand-pink/90 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            After
          </span>
        </div>

        {/* Hover hint that this opens larger — fades in, doesn't clutter the default view */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-black/0 text-white opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold">
            <ZoomIcon />
            View larger
          </span>
        </div>
      </div>
      {photo.title && (
        <p className="truncate px-3 py-2.5 text-sm font-semibold text-zinc-700">{photo.title}</p>
      )}
    </button>
  );
}
