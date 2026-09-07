"use client";
// Full-size before/after viewer. Opens when a GalleryCard is clicked.
// Takes the FULL photo list (not just the current page's visible slice)
// so prev/next inside the lightbox can move through everything, not just
// the 3-4 cards that happened to be on screen when it was opened.
import { useEffect } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "@/lib/types/gallery";

export default function GalleryLightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((index - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") onNavigate((index + 1) % photos.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, photos.length, onClose, onNavigate]);

  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <p className="flex-1 truncate text-sm font-semibold text-zinc-700 sm:text-base">
            {photo.title || "Before & After"}
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-pink-50 sm:aspect-[4/5]">
            <Image src={photo.before_url} alt={`${photo.title ?? "Pet"} before`} fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" unoptimized />
            <span className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1 text-xs font-bold uppercase text-white">
              Before
            </span>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-pink-50 sm:aspect-[4/5]">
            <Image src={photo.after_url} alt={`${photo.title ?? "Pet"} after`} fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" unoptimized />
            <span className="absolute bottom-3 left-3 rounded-full bg-brand-pink px-3 py-1 text-xs font-bold uppercase text-white">
              After
            </span>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
              className="flex items-center gap-1.5 rounded-full bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-pink transition-colors hover:bg-pink-100"
            >
              ‹ Previous
            </button>
            <span className="text-xs text-zinc-400">
              {index + 1} / {photos.length}
            </span>
            <button
              onClick={() => onNavigate((index + 1) % photos.length)}
              className="flex items-center gap-1.5 rounded-full bg-brand-tint px-4 py-2 text-sm font-semibold text-brand-pink transition-colors hover:bg-pink-100"
            >
              Next ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
