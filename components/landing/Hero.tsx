"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { HeroSlide } from "@/lib/types/hero-slides";
import styles from "./Hero.module.css";
import "./hero-overflow.css";

const AUTOPLAY_MS = 2000;

export default function Hero({ slides, logoUrl }: { slides: HeroSlide[]; logoUrl?: string | null }) {
  const router = useRouter();
  const resolvedLogo = logoUrl || "/images/logo.png";
  const isRemoteLogo = !!logoUrl && logoUrl !== "/images/logo.png";
  const displaySlides: { id: string; image_url: string }[] = slides.length > 0
    ? slides
    : [{ id: "default", image_url: "/images/hero-bg.png" }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeIndex = index < displaySlides.length ? index : 0;
  const activeSlide = displaySlides[activeIndex];

  const goTo = useCallback((next: number) => {
    setIndex(((next % displaySlides.length) + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  useEffect(() => {
    if (displaySlides.length <= 1 || paused) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % displaySlides.length), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, displaySlides.length]);

  async function handleBookNow() {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    router.push(data.user ? "/account/appointments" : "/sign-in");
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) > 40) goTo(activeIndex + (delta < 0 ? 1 : -1));
  }

  return (
    <section
      className={`${styles.root} ht-hero-root`}
      aria-label="Happy Tails featured promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.frame}>
        {/* Only one slide is painted at a time. Avoid overlapping, transparent
            full-frame layers that can leave Safari compositor artifacts. */}
        <div key={activeSlide.id} className={styles.slide}>
          <Image
            src={activeSlide.image_url}
            alt="Happy Tails Pet Grooming Cafe promotion"
            fill
            priority={activeIndex === 0}
            className={styles.slideImage}
            sizes="100vw"
            unoptimized={activeSlide.image_url !== "/images/hero-bg.png"}
          />
        </div>

        <div className={styles.content}>
          <Image
            src={resolvedLogo}
            alt="Happy Tails Pet Grooming Cafe — Supplies, Boarding and Coffee"
            width={340}
            height={340}
            className={styles.logo}
            unoptimized={isRemoteLogo}
          />
          <button type="button" onClick={handleBookNow} className={styles.bookButton}>
            Book Now
          </button>
        </div>

        {displaySlides.length > 1 && (
          <>
            <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="Previous slide" className={`${styles.arrow} ${styles.previous}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="Next slide" className={`${styles.arrow} ${styles.next}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className={styles.dots} aria-label="Choose carousel slide">
              {displaySlides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === activeIndex ? "true" : undefined}
                  className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ""}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
