"use client";
// Manage the homepage hero carousel: add a slide (uploads to the
// site-images bucket + inserts a hero_slides row), reorder with up/down
// arrows, toggle a slide active/inactive without deleting it, or delete
// it outright. Same modal styling as the rest of the admin (white
// rounded-3xl card over a dark overlay, brand-pink accents).
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { HeroSlide } from "@/lib/types/hero-slides";
import {
  fetchAllHeroSlides,
  uploadHeroSlideImage,
  addHeroSlide,
  setHeroSlideActive,
  deleteHeroSlide,
  swapHeroSlideOrder,
} from "@/lib/supabase/hero-slides";

export default function HeroSlidesManager({ onClose }: { onClose: () => void }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { slides, error } = await fetchAllHeroSlides();
      if (error) setError(error);
      setSlides(slides);
      setLoading(false);
    }
    load();
  }, []);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);

    const uploaded = await uploadHeroSlideImage(file);
    if (uploaded.error || !uploaded.url) {
      setError(uploaded.error || "Upload failed.");
      setUploading(false);
      return;
    }

    const nextSortOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
    const { slide, error: insertError } = await addHeroSlide(
      { url: uploaded.url, width: uploaded.width!, height: uploaded.height! },
      nextSortOrder
    );
    if (insertError || !slide) {
      setError(insertError || "Couldn't save the slide.");
      setUploading(false);
      return;
    }

    setSlides((prev) => [...prev, slide]);
    setUploading(false);
  }

  async function handleToggleActive(slide: HeroSlide) {
    setError(null);
    const { error } = await setHeroSlideActive(slide.id, !slide.active);
    if (error) {
      setError(error);
      return;
    }
    setSlides((prev) => prev.map((s) => (s.id === slide.id ? { ...s, active: !s.active } : s)));
  }

  async function handleDelete(slide: HeroSlide) {
    if (!confirm("Delete this slide? This can't be undone.")) return;
    setError(null);
    const { error } = await deleteHeroSlide(slide.id);
    if (error) {
      setError(error);
      return;
    }
    setSlides((prev) => prev.filter((s) => s.id !== slide.id));
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    setError(null);
    const a = slides[index];
    const b = slides[targetIndex];
    const { error } = await swapHeroSlideOrder(
      { id: a.id, sort_order: a.sort_order },
      { id: b.id, sort_order: b.sort_order }
    );
    if (error) {
      setError(error);
      return;
    }

    const next = [...slides];
    [next[index], next[targetIndex]] = [
      { ...next[targetIndex], sort_order: a.sort_order },
      { ...next[index], sort_order: b.sort_order },
    ];
    setSlides(next);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-brand-pink flex-1">Manage Hero Slides</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-sm font-semibold">
            Close
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          These rotate automatically on the homepage. Order top-to-bottom here matches left-to-right on the site.
        </p>

        {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-zinc-400">Loading slides...</p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {slides.length === 0 && (
              <p className="text-sm text-zinc-400">No slides yet — add one below to start the carousel.</p>
            )}
            {slides.map((slide, i) => (
              <div key={slide.id} className="flex items-center gap-3 rounded-2xl border-2 border-brand-tint p-2.5">
                <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-brand-tint">
                  <Image src={slide.image_url} alt="" fill className="object-cover" unoptimized />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${slide.active ? "text-zinc-700" : "text-zinc-400"}`}>
                    Slide {i + 1} {!slide.active && "(hidden)"}
                  </p>
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className="text-xs font-semibold text-brand-pink hover:underline"
                  >
                    {slide.active ? "Hide from carousel" : "Show in carousel"}
                  </button>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="w-7 h-7 rounded-full border-2 border-zinc-200 text-zinc-500 disabled:opacity-30 hover:border-brand-pink hover:text-brand-pink transition-colors flex items-center justify-center"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(i, 1)}
                    disabled={i === slides.length - 1}
                    aria-label="Move down"
                    className="w-7 h-7 rounded-full border-2 border-zinc-200 text-zinc-500 disabled:opacity-30 hover:border-brand-pink hover:text-brand-pink transition-colors flex items-center justify-center"
                  >
                    ↓
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(slide)}
                  aria-label="Delete slide"
                  className="shrink-0 w-8 h-8 rounded-full border-2 border-red-200 text-red-400 hover:border-red-400 hover:text-red-600 transition-colors flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-5 w-full border-2 border-dashed border-brand-pink text-brand-pink font-semibold text-sm py-3 rounded-2xl hover:bg-brand-tint transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "+ Add Slide"}
        </button>
      </div>
    </div>
  );
}
