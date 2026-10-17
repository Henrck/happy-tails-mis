"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { HeroSlide } from "@/lib/types/hero-slides";
import ActionConfirmModal from "@/components/admin/operations/ActionConfirmModal";
import { fetchAllHeroSlides, uploadHeroSlideImage, addHeroSlide, setHeroSlideActive, deleteHeroSlide, swapHeroSlideOrder } from "@/lib/supabase/hero-slides";

export default function HeroSlidesManager({ onClose }: { onClose: () => void }) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { slides, error } = await fetchAllHeroSlides();
      if (error) setError(error);
      setSlides(slides);
      setLoading(false);
    }
    void load();
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
    const { slide, error: insertError } = await addHeroSlide({ url: uploaded.url, width: uploaded.width!, height: uploaded.height! }, nextSortOrder);
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
    if (error) { setError(error); return; }
    setSlides((prev) => prev.map((s) => s.id === slide.id ? { ...s, active: !s.active } : s));
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const { error } = await deleteHeroSlide(deleteTarget.id);
      if (error) { setError(error); return; }
      setSlides((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    setError(null);
    const a = slides[index];
    const b = slides[targetIndex];
    const { error } = await swapHeroSlideOrder({ id: a.id, sort_order: a.sort_order }, { id: b.id, sort_order: b.sort_order });
    if (error) { setError(error); return; }
    const next = [...slides];
    [next[index], next[targetIndex]] = [{ ...next[targetIndex], sort_order: a.sort_order }, { ...next[index], sort_order: b.sort_order }];
    setSlides(next);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg max-h-[min(85dvh,800px)] overflow-y-auto overscroll-contain rounded-3xl bg-white p-4 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h3 className="min-w-0 flex-1 text-lg font-bold text-brand-pink">Manage Hero Slides</h3>
          <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm font-semibold text-zinc-500">Close</button>
        </div>
        <p className="mt-1 text-xs text-zinc-400">These rotate automatically on the homepage. Order top-to-bottom here matches left-to-right on the site.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {loading ? <p className="mt-6 text-sm text-zinc-400">Loading slides...</p> : (
          <div className="mt-4 flex flex-col gap-3">
            {slides.length === 0 && <p className="text-sm text-zinc-400">No slides yet — add one below to start the carousel.</p>}
            {slides.map((slide, i) => (
              <div key={slide.id} className="flex min-w-0 items-center gap-2 rounded-2xl border-2 border-brand-tint p-2 sm:gap-3 sm:p-2.5">
                <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-tint sm:w-20"><Image src={slide.image_url} alt="" fill className="object-cover" unoptimized /></div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${slide.active ? "text-zinc-700" : "text-zinc-400"}`}>Slide {i + 1} {!slide.active && "(hidden)"}</p>
                  <button type="button" onClick={() => void handleToggleActive(slide)} className="min-h-9 text-left text-xs font-semibold text-brand-pink">{slide.active ? "Hide from carousel" : "Show in carousel"}</button>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => void handleMove(i, -1)} disabled={i === 0} aria-label="Move up" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-200 text-zinc-500 disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => void handleMove(i, 1)} disabled={i === slides.length - 1} aria-label="Move down" className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-200 text-zinc-500 disabled:opacity-30">↓</button>
                </div>
                <button type="button" onClick={() => setDeleteTarget(slide)} aria-label={`Delete slide ${i + 1}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-red-200 text-red-500">✕</button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="mt-5 min-h-11 w-full rounded-2xl border-2 border-dashed border-brand-pink py-3 text-sm font-semibold text-brand-pink disabled:opacity-50">{uploading ? "Uploading..." : "+ Add Slide"}</button>
      </div>
      {deleteTarget && <ActionConfirmModal title="Delete hero slide?" description="This slide will be permanently deleted. This action cannot be undone." confirmLabel="Delete Slide" destructive pending={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirmed} />}
    </div>
  );
}
