"use client";

import { useState } from "react";
import type { GalleryPhoto } from "@/lib/types/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";

const PAGE_SIZE = 10;

export default function GalleryPageClient({ photos }: { photos: GalleryPhoto[] }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const visible = photos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="site-container mt-8 rounded-3xl bg-brand-pink p-6 md:p-8">
      {visible.length === 0 ? (
        <p className="py-10 text-center text-white">No before-and-after photos yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {visible.map((photo) => <GalleryCard key={photo.id} photo={photo} />)}
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
    </div>
  );
}
