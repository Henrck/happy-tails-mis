// Shared before/after photo tile, used by both the homepage carousel and
// the full /gallery page. Shows a placeholder until real photos exist.
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/data/gallery";

export default function GalleryCard({ photo }: { photo: GalleryPhoto }) {
  return (
    <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-white bg-pink-50">
      {photo.imageUrl ? (
        <Image src={photo.imageUrl} alt={photo.petName ?? "Groomed pet"} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-10 h-10 text-pink-200">
            <path
              fill="currentColor"
              d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2.7-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2.7-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
