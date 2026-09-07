"use client";
// Full gallery page. Same fix as the homepage teaser: fewer columns so
// each photo is bigger, and clicking a card opens the shared lightbox.
import { useState } from "react";
import type { GalleryPhoto } from "@/lib/types/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";
import GalleryLightbox from "@/components/gallery/GalleryLightbox";

const PAGE_SIZE = 9;

export default function GalleryPageClient({ photos }: { photos: GalleryPhoto[] }) {
  const [page, setPage] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const visible = photos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="site-container mt-8 rounded-3xl bg-brand-pink p-6 md:p-8">
      {visible.length === 0 ? (
        <p className="py-10 text-center text-white">No before-and-after photos yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((photo) => (
            <GalleryCard
              key={photo.id}
              photo={photo}
              onClick={() => setLightboxIndex(photos.findIndex((p) => p.id === photo.id))}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-9 w-9 rounded-full text-sm font-semibold ${
                page === i ? "bg-white text-brand-pink" : "bg-pink-400 text-white hover:bg-pink-300"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
