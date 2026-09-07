import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types/gallery";

export default function GalleryCard({ photo }: { photo: GalleryPhoto }) {
  return (
    <article className="overflow-hidden rounded-2xl border-2 border-white bg-white shadow-sm">
      <div className="grid grid-cols-2 gap-1 bg-pink-50 p-1">
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <Image src={photo.before_url} alt={`${photo.title ?? "Pet"} before`} fill sizes="(min-width: 768px) 20vw, 45vw" className="object-cover" unoptimized />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[9px] font-bold uppercase text-white">Before</span>
        </div>
        <div className="relative aspect-square overflow-hidden rounded-xl">
          <Image src={photo.after_url} alt={`${photo.title ?? "Pet"} after`} fill sizes="(min-width: 768px) 20vw, 45vw" className="object-cover" unoptimized />
          <span className="absolute bottom-2 left-2 rounded-full bg-brand-pink/90 px-2 py-0.5 text-[9px] font-bold uppercase text-white">After</span>
        </div>
      </div>
      {photo.title && (
        <p className="truncate px-3 py-2 text-xs font-semibold text-zinc-700">{photo.title}</p>
      )}
    </article>
  );
}
