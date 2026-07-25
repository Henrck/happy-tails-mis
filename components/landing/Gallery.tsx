"use client";
// Photo gallery carousel — this REPLACES the original testimonials/star-
// review section per Josh's decision. Shows before/after grooming shots,
// paged with arrows like the Products carousel. "View More" is relocated
// below the carousel (rather than overlapping the grid like the original
// screenshot) and links to a full /gallery page, same pattern as Products.
// No real photos yet — placeholders until the admin module supports photo
// uploads for this section.
import { useState } from "react";
import Link from "next/link";
import { galleryPhotos } from "@/lib/data/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";

const PAGE_SIZE = 4;

export default function Gallery() {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(galleryPhotos.length / PAGE_SIZE));
  const visible = galleryPhotos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function prev() {
    setPage((p) => (p - 1 + pageCount) % pageCount);
  }
  function next() {
    setPage((p) => (p + 1) % pageCount);
  }

  return (
    <section className="py-14 bg-brand-tint">
      <div className="site-container text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900">
          Happy Tails, Happy Pets
        </h2>
        <p className="mt-2 text-sm md:text-base text-zinc-600">
          A few before-and-afters from our grooming table.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={prev}
            aria-label="Previous photos"
            className="shrink-0 w-9 h-9 rounded-full bg-brand-pink hover:bg-brand-pink-dark text-white flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {visible.map((photo) => (
              <GalleryCard key={photo.id} photo={photo} />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next photos"
            className="shrink-0 w-9 h-9 rounded-full bg-brand-pink hover:bg-brand-pink-dark text-white flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <Link
          href="/gallery"
          className="mt-8 inline-block bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-colors"
        >
          View More
        </Link>
      </div>
    </section>
  );
}
