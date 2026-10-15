"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { GalleryPhoto } from "@/lib/types/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";
import GalleryLightbox from "@/components/gallery/GalleryLightbox";

const PAGE_SIZE = 3;
const AUTOPLAY_MS = 4000;

export default function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const visible = photos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (pageCount <= 1 || paused || lightboxIndex !== null) return;
    const id = window.setInterval(() => setPage((p) => (p + 1) % pageCount), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [pageCount, paused, lightboxIndex]);

  return (
    <section className="bg-white py-14">
      <div className="site-container text-center">
        <h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">Happy Tails, Happy Pets</h2>
        <p className="mt-2 text-sm text-zinc-600 md:text-base">A few before-and-afters from our grooming table.</p>

        {visible.length ? (
          <div
            className="mt-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
              {visible.map((photo) => (
                <GalleryCard
                  key={photo.id}
                  photo={photo}
                  onClick={() => setLightboxIndex(photos.findIndex((p) => p.id === photo.id))}
                />
              ))}
            </div>
            {pageCount > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button type="button" onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)} aria-label="Previous photos" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-xl text-white transition-colors hover:bg-brand-pink-dark">‹</button>
                <span className="text-sm text-zinc-500" aria-live="polite">{page + 1} / {pageCount}</span>
                <button type="button" onClick={() => setPage((p) => (p + 1) % pageCount)} aria-label="Next photos" className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pink text-xl text-white transition-colors hover:bg-brand-pink-dark">›</button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-brand-pink-light/60 bg-brand-tint px-6 py-10 text-sm text-zinc-500">
            Before-and-after photos will appear here soon.
          </div>
        )}

        <Link href="/gallery" className="mt-8 inline-block rounded-full bg-brand-pink px-8 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-pink-dark">
          View More
        </Link>
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
