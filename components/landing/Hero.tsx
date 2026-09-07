"use client";
// Hero section — top of the landing page. Now a real carousel: rotates
// through however many slides the superadmin has uploaded via Website
// Management (hero_slides table), so there's an active "advertisement"
// the moment a visitor lands, not just one static photo.
//
// The logo + "Book Now" CTA are intentionally NOT part of each slide —
// they stay fixed on top through every rotation. That keeps the brand
// mark and the one action that matters consistent no matter which promo
// image is currently showing, instead of every slide needing its own
// logo/CTA baked in (which the admin would have to redo for every photo
// they upload).
//
// REAL BUG FIXED (kept from before): "Book Now" checks the session
// directly — logged in -> /account/appointments (the real route),
// logged out -> /sign-in.
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HeroSlide } from "@/lib/types/hero-slides";

const AUTOPLAY_MS = 5500;

export default function Hero({
  slides,
  logoUrl,
}: {
  slides: HeroSlide[];
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const resolvedLogo = logoUrl || "/images/logo.png";
  const isRemoteLogo = !!logoUrl && logoUrl !== "/images/logo.png";

  // Fallback to the bundled default photo if no slides have been
  // uploaded yet, so the hero never renders blank.
  const displaySlides: { id: string; image_url: string }[] =
    slides.length > 0 ? slides : [{ id: "default", image_url: "/images/hero-bg.png" }];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Clamp at render time rather than in an effect — if the admin deletes
  // a slide out from under a visitor's stale index, this just falls back
  // to the first slide immediately with no extra render/effect round-trip.
  const activeIndex = index < displaySlides.length ? index : 0;

  const goTo = useCallback(
    (i: number) => {
      setIndex(((i % displaySlides.length) + displaySlides.length) % displaySlides.length);
    },
    [displaySlides.length]
  );

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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      goTo(activeIndex + (delta < 0 ? 1 : -1));
    }
    touchStartX.current = null;
  }

  return (
    <section
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full aspect-[3/2] md:aspect-[16/7] overflow-hidden bg-brand-tint">
        {/* Crossfading slides */}
        {displaySlides.map((slide, i) => (
          <div
            key={slide.id}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
            aria-hidden={i !== activeIndex}
          >
            <Image
              src={slide.image_url}
              alt="Happy Tails Pet Grooming Cafe promotion"
              fill
              priority={i === 0}
              className="object-cover"
              unoptimized={slide.image_url !== "/images/hero-bg.png"}
            />
          </div>
        ))}

        {/* Fixed brand overlay — same on every slide */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Image
            src={resolvedLogo}
            alt="Happy Tails Pet Grooming Cafe — Supplies, Boarding and Coffee"
            width={340}
            height={340}
            className="w-[60%] max-w-[340px] h-auto drop-shadow-lg"
            unoptimized={isRemoteLogo}
          />
          <button
            onClick={handleBookNow}
            className="pointer-events-auto mt-3 md:mt-5 flex items-center gap-2 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm md:text-base shadow-lg"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5 9.5c1.1 0 2-1.1 2-2.5S9.6 4.5 8.5 4.5 6.5 5.6 6.5 7s.9 2.5 2 2.5zm7 0c1.1 0 2-1.1 2-2.5s-.9-2.5-2-2.5-2 1.1-2 2.5.9 2.5 2 2.5zM4.5 14c1.1 0 2-1.1 2-2.5S5.6 9 4.5 9 2.5 10.1 2.5 11.5 3.4 14 4.5 14zm15 0c1.1 0 2-1.1 2-2.5S20.6 9 19.5 9s-2 1.1-2 2.5.9 2.5 2 2.5zM12 12c-2.5 0-7 1.5-7 4.5V18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-1.5c0-3-4.5-4.5-7-4.5z"/>
            </svg>
            Book Now
          </button>
        </div>

        {/* Arrows — only when there's more than one slide to move between */}
        {displaySlides.length > 1 && (
          <>
            <button
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous slide"
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/70 hover:bg-white text-brand-pink flex items-center justify-center shadow-md backdrop-blur-sm transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next slide"
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/70 hover:bg-white text-brand-pink flex items-center justify-center shadow-md backdrop-blur-sm transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {displaySlides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
