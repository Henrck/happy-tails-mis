"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HeroSlide } from "@/lib/types/hero-slides";

const AUTOPLAY_MS = 2000;

export default function Hero({ slides, logoUrl }: { slides: HeroSlide[]; logoUrl?: string | null }) {
  const router = useRouter();
  const resolvedLogo = logoUrl || "/images/logo.png";
  const isRemoteLogo = !!logoUrl && logoUrl !== "/images/logo.png";
  const displaySlides: { id: string; image_url: string }[] = slides.length > 0 ? slides : [{ id: "default", image_url: "/images/hero-bg.png" }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeIndex = index < displaySlides.length ? index : 0;

  const goTo = useCallback((i: number) => {
    setIndex(((i % displaySlides.length) + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  useEffect(() => {
    if (displaySlides.length <= 1 || paused) return;
    const timer = setInterval(() => goTo(activeIndex + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [activeIndex, paused, displaySlides.length, goTo]);

  async function handleBookNow() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    router.push(data.user ? "/account/appointments" : "/sign-in");
  }

  function handleTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0]?.clientX ?? null; }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(delta) > 40) goTo(activeIndex + (delta < 0 ? 1 : -1));
    touchStartX.current = null;
  }

  return (
    <section className="relative overflow-hidden" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-brand-tint sm:aspect-[16/9] md:aspect-[16/8] lg:aspect-[16/6.8]">
        {displaySlides.map((slide, i) => (
          <div key={slide.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === activeIndex ? 1 : 0 }} aria-hidden={i !== activeIndex}>
            <Image src={slide.image_url} alt="Happy Tails Pet Grooming Cafe promotion" fill priority={i === 0} className="object-cover object-center" sizes="100vw" unoptimized={slide.image_url !== "/images/hero-bg.png"} />
          </div>
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 py-8 sm:px-8 sm:py-10 pointer-events-none">
          <Image src={resolvedLogo} alt="Happy Tails Pet Grooming Cafe — Supplies, Boarding and Coffee" width={340} height={340} className="h-auto w-[62%] max-w-[340px] sm:w-[42%] md:w-[30%] lg:w-[280px] drop-shadow-lg" unoptimized={isRemoteLogo} />
          <button onClick={handleBookNow} className="pointer-events-auto mt-3 flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-brand-pink-dark sm:mt-4 sm:px-6 sm:text-base">
            Book Now
          </button>
        </div>

        {displaySlides.length > 1 && (
          <>
            <button onClick={() => goTo(activeIndex - 1)} aria-label="Previous slide" className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/75 text-brand-pink shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:left-4 sm:h-10 sm:w-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => goTo(activeIndex + 1)} aria-label="Next slide" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/75 text-brand-pink shadow-md backdrop-blur-sm transition-colors hover:bg-white sm:right-4 sm:h-10 sm:w-10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
              {displaySlides.map((slide, i) => <button key={slide.id} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"}`} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
