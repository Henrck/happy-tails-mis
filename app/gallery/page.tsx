"use client";
// Full before/after photo gallery — reached via "View More" on the
// homepage. Same structural pattern as /products (grid + numbered
// pagination). No real photos yet, so this shows placeholders until the
// admin module supports photo uploads for this section.
import { useState } from "react";
import { galleryPhotos } from "@/lib/data/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";
import Navbar from "@/components/landing/Navbar";

const PAGE_SIZE = 10;

export default function GalleryPage() {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(galleryPhotos.length / PAGE_SIZE));
  const visible = galleryPhotos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <main className="min-h-screen bg-brand-tint">
      <Navbar />

      <div className="py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 text-center">
          Happy Tails, Happy Pets
        </h1>
        <p className="mt-2 text-sm md:text-base text-zinc-600 text-center">
          Before-and-afters from our grooming table.
        </p>

        <div className="mt-8 site-container bg-brand-pink rounded-3xl p-6 md:p-8">
          {visible.length === 0 ? (
            <p className="text-white text-center py-10">
              No photos yet — check back soon!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 justify-items-center">
              {visible.map((photo) => (
                <GalleryCard key={photo.id} photo={photo} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    page === i
                      ? "bg-white text-brand-pink"
                      : "bg-pink-400 text-white hover:bg-pink-300"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
