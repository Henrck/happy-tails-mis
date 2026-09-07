"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GalleryPhoto } from "@/lib/types/gallery";
import GalleryCard from "@/components/gallery/GalleryCard";

const PAGE_SIZE = 4;
const AUTOPLAY_MS = 3000;

export default function Gallery({ photos }: { photos: GalleryPhoto[] }) {
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const pageCount = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
  const visible = photos.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  useEffect(() => { if (pageCount <= 1 || paused) return; const id = window.setInterval(() => setPage((p) => (p + 1) % pageCount), AUTOPLAY_MS); return () => window.clearInterval(id); }, [pageCount, paused]);
  return <section className="bg-brand-tint py-14"><div className="site-container text-center"><h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">Happy Tails, Happy Pets</h2><p className="mt-2 text-sm text-zinc-600 md:text-base">A few before-and-afters from our grooming table.</p>{visible.length ? <div className="mt-8 flex items-center gap-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}><button onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)} aria-label="Previous photos" className="h-9 w-9 shrink-0 rounded-full bg-brand-pink text-white">‹</button><div className="grid min-w-0 flex-1 grid-cols-2 gap-4 md:grid-cols-4">{visible.map((photo) => <GalleryCard key={photo.id} photo={photo}/>)}</div><button onClick={() => setPage((p) => (p + 1) % pageCount)} aria-label="Next photos" className="h-9 w-9 shrink-0 rounded-full bg-brand-pink text-white">›</button></div> : <div className="mt-8 rounded-2xl border border-brand-pink-light/60 bg-white/70 px-6 py-10 text-sm text-zinc-500">Before-and-after photos will appear here soon.</div>}<Link href="/gallery" className="mt-8 inline-block rounded-full bg-brand-pink px-8 py-2.5 text-sm font-semibold text-white hover:bg-brand-pink-dark">View More</Link></div></section>;
}
