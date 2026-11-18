"use client";
// Before & after carousel: one groom at a time on a drag-to-compare slider,
// with a numbered counter, arrows and a thumbnail rail to jump between grooms.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryPhoto } from "@/lib/types/gallery";
import BeforeAfterCompare from "./BeforeAfterCompare";

const SERVICE_LABEL: Record<string, string> = {
  grooming: "Grooming", boarding: "Boarding", dental: "Dental care", ear_cleaning: "Ear cleaning", nail_trimming: "Nail trim", other: "Spa",
};
const AUTOPLAY_MS = 7000;
const pad = (n: number) => String(n).padStart(2, "0");

export default function HomeBeforeAfter({ photos, heading, subheading }: { photos: GalleryPhoto[]; heading: string; subheading: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  const count = photos.length;
  const current = photos[Math.min(index, Math.max(0, count - 1))];

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  // Keep the active thumbnail visible in the rail.
  useEffect(() => {
    const thumb = rail.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (thumb && rail.current) rail.current.scrollTo({ left: thumb.offsetLeft - rail.current.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
  }, [index]);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);
  const service = current ? SERVICE_LABEL[current.service] ?? "Grooming" : "";
  const title = current?.title?.trim() || `${service} transformation`;

  return <section id="before-after" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
    <div className="text-center">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pink">Real grooms · Real pets</p>
      <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#2A1626] sm:text-5xl">{heading || "Before & after"}</h2>
      <p className="mx-auto mt-3 max-w-lg text-base text-zinc-500">{subheading}</p>
    </div>

    {!current ? <p className="mt-10 rounded-[22px] border border-dashed border-pink-200 p-10 text-center text-zinc-500">Before-and-after photos will appear here once they&apos;re added in Website Management.</p> :
      <div className="mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onPointerDown={() => setPaused(true)}>
        <div className="aspect-[4/3] w-full">
          <BeforeAfterCompare key={current.id} before={current.before_url} after={current.after_url} title={title} priority={index === 0}/>
        </div>

        <div className="min-w-0">
          <p className="font-heading text-6xl font-bold leading-none text-brand-pink/20" aria-hidden="true">{pad(index + 1)}<span className="text-2xl text-zinc-300"> / {pad(count)}</span></p>
          <span className="mt-4 inline-block rounded-full bg-brand-tint px-3 py-1 text-xs font-bold text-brand-pink">{service}</span>
          <h3 className="mt-3 text-2xl font-bold text-[#2A1626] sm:text-3xl" aria-live="polite">{title}</h3>
          <p className="mt-2 text-sm text-zinc-500">Drag the handle across the photo to see the difference.</p>

          {count > 1 && <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={() => go(-1)} aria-label="Previous groom" className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-200 bg-white text-brand-pink transition hover:bg-brand-pink hover:text-white"><ChevronLeft size={20}/></button>
            <button type="button" onClick={() => go(1)} aria-label="Next groom" className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-pink text-white transition hover:bg-brand-pink-dark"><ChevronRight size={20}/></button>
            <Link href="/gallery" className="ml-auto inline-flex items-center gap-1.5 text-sm font-bold text-[#2A1626] hover:text-brand-pink">Full gallery <ArrowRight size={16}/></Link>
          </div>}

          {count > 1 && <div ref={rail} className="no-scrollbar mt-5 flex gap-2.5 overflow-x-auto pb-1" aria-label="Choose a groom">
            {photos.map((photo, i) => <button key={photo.id} type="button" data-index={i} onClick={() => setIndex(i)}
              aria-label={`Show ${photo.title?.trim() || `groom ${i + 1}`}`} aria-current={i === index}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl transition ${i === index ? "ring-2 ring-brand-pink ring-offset-2 ring-offset-[#FFF9FB]" : "opacity-60 hover:opacity-100"}`}>
              <Image src={photo.after_url} alt="" fill sizes="64px" className="object-cover"/>
            </button>)}
          </div>}
        </div>
      </div>}
  </section>;
}
