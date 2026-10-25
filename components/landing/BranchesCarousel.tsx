"use client";

import { useRef } from "react";
import Image from "next/image";
import type { WebsiteBranch } from "@/lib/types/website-branches";

export default function BranchesCarousel({ branches }: { branches: WebsiteBranch[] }) {
  const track = useRef<HTMLDivElement>(null);
  if (!branches.length) return null;
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.querySelector("a")?.getBoundingClientRect().width ?? 300) + direction * 20, behavior: "smooth" });
  };
  return (
    <section id="branches" className="relative isolate overflow-hidden bg-gradient-to-br from-[#fff0f7] via-[#ffe0ef] to-[#fdf1f7] py-14 md:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-brand-pink-light/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-brand-pink/15 blur-3xl" />
      <svg aria-hidden="true" viewBox="0 0 80 80" className="pointer-events-none absolute right-[8%] top-8 hidden h-20 w-20 rotate-12 text-brand-pink/10 md:block" fill="currentColor">
        <circle cx="19" cy="27" r="8"/><circle cx="36" cy="14" r="8"/><circle cx="55" cy="18" r="8"/><circle cx="67" cy="36" r="7"/><path d="M38 35c-14 0-27 14-27 26 0 9 8 15 17 12 5-2 7-5 12-5 4 0 7 4 12 5 10 2 17-4 17-13 0-13-16-25-31-25Z"/>
      </svg>
      <div className="site-container relative z-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-pink-dark md:text-3xl">Visit Our Other HappyTails Branches</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-700 md:text-base">Find a HappyTails Pet Grooming Cafe near you. Explore each branch on Facebook.</p>
          </div>
          {branches.length > 1 && <div className="flex gap-2">
            <button type="button" onClick={() => move(-1)} aria-label="Previous branches" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pink text-xl text-white hover:bg-brand-pink-dark">‹</button>
            <button type="button" onClick={() => move(1)} aria-label="Next branches" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pink text-xl text-white hover:bg-brand-pink-dark">›</button>
          </div>}
        </div>
        <div ref={track} className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 [scrollbar-width:thin]" aria-label="HappyTails branch carousel">
          {branches.map(branch => <a key={branch.id} href={branch.facebook_url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${branch.name} on Facebook (opens new tab)`} className="group w-[84%] shrink-0 snap-start overflow-hidden rounded-3xl border border-white/90 bg-white shadow-[0_12px_32px_rgba(212,43,124,0.12)] ring-1 ring-brand-pink-light/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(212,43,124,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink sm:w-[46%] lg:w-[31%]">
            <div className="relative aspect-[16/10] overflow-hidden bg-pink-100">
              {branch.image_url ? <Image src={branch.image_url} alt={`${branch.name} branch`} fill sizes="(min-width:1024px) 32vw, (min-width:640px) 50vw, 90vw" className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized /> : <div className="flex h-full items-center justify-center text-5xl" aria-hidden="true">🐾</div>}
            </div>
            <div className="border-t border-pink-100 p-5">
              <h3 className="text-lg font-bold text-brand-pink">{branch.name}</h3>
              <p className="mt-2 flex items-start gap-2 text-sm text-zinc-700"><span aria-hidden="true">📍</span><span className="break-words">{branch.location}</span></p>
              {branch.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-600">{branch.description}</p>}
              <span className="mt-5 inline-flex rounded-full bg-brand-pink px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-brand-pink-dark">Visit Facebook Page ↗</span>
            </div>
          </a>)}
        </div>
      </div>
    </section>
  );
}
