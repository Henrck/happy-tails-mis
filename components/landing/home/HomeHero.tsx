"use client";
// Hero: the hero slides fill the background (they are designed with an open
// centre), and a frosted "postcard" with the logo, headline and actions sits
// in the middle. On phones the slide sits above the card, which overlaps it.
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ShoppingBag } from "lucide-react";
import type { HeroSlide } from "@/lib/types/hero-slides";
import { copy } from "@/lib/website/catalog";

const SERVICES = [
  { emoji: "✂️", label: "Grooming", href: "#services" },
  { emoji: "🏠", label: "Boarding", href: "#services" },
  { emoji: "✨", label: "Spa", href: "#services" },
  { emoji: "☕", label: "Café", href: "#about" },
];

export default function HomeHero({ slides, logoUrl, text }: { slides: HeroSlide[]; logoUrl?: string | null; text: Record<string, string> }) {
  const images = slides.length ? slides.map((s) => s.image_url) : ["/images/hero-bg.png"];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (images.length < 2 || paused) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 6000);
    return () => window.clearInterval(timer);
  }, [images.length, paused]);
  const logo = logoUrl || "/images/logo.png";

  const slideLayer = (sizes: string) => images.map((src, i) => <Image key={src + i} src={src} alt="" fill priority={i === 0} sizes={sizes}
    className={`object-cover transition-all duration-[1200ms] ease-out ${i === index ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"}`}/>);

  return <section className="relative" aria-label="Welcome to Happy Tails" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    {/* Slide backdrop (desktop: full width; phones: framed photo above the card). */}
    <div className="relative mx-4 mt-4 aspect-[16/9] overflow-hidden rounded-[26px] bg-brand-tint lg:absolute lg:inset-0 lg:m-0 lg:aspect-auto lg:rounded-none" aria-hidden="true">
      {slideLayer("100vw")}
    </div>

    <div className="relative mx-auto flex max-w-6xl justify-center px-5 lg:min-h-[min(88vh,56.25vw)] lg:items-center lg:py-16">
      <div className="relative -mt-12 w-full max-w-[520px] rounded-[32px] border border-white/70 bg-white/85 px-6 pb-8 pt-12 text-center shadow-[0_30px_70px_-30px_rgba(42,22,38,0.45)] backdrop-blur-md sm:px-10 lg:mt-0">
        <Image src={logo} alt="Happy Tails" width={76} height={76} unoptimized={logo.startsWith("http")}
          className="absolute -top-[38px] left-1/2 h-[76px] w-[76px] -translate-x-1/2 rounded-full border-4 border-white bg-white object-contain shadow-md"/>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-pink">{copy("hero_eyebrow", text)}</p>
        <h1 className="mt-4 text-[2.6rem] font-bold leading-[1.02] tracking-tight text-[#2A1626] sm:text-6xl">
          {copy("hero_heading", text)} <span className="relative inline-block text-brand-pink">
            {copy("hero_highlight", text)}
            <svg viewBox="0 0 200 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-brand-pink/40" aria-hidden="true"><path d="M2 9C50 2 150 2 198 8" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-base leading-relaxed text-zinc-600">
          {copy("hero_description", text)}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/account/appointments" className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-pink px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-pink/30 transition hover:-translate-y-0.5 hover:bg-brand-pink-dark">
            Book an appointment <CalendarDays size={17}/>
          </Link>
          <Link href="/products" className="inline-flex items-center justify-center gap-2 rounded-full border border-pink-200 bg-white px-6 py-3.5 text-sm font-bold text-[#2A1626] transition hover:-translate-y-0.5 hover:border-brand-pink hover:text-brand-pink">
            Shop products <ShoppingBag size={16}/>
          </Link>
        </div>
        <ul className="mt-7 grid grid-cols-4 gap-2 border-t border-pink-100 pt-6">
          {SERVICES.map((item) => <li key={item.label}>
            <a href={item.href} className="group flex flex-col items-center gap-1.5 rounded-2xl py-1.5 text-xs font-bold text-zinc-600 transition hover:text-brand-pink">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-lg transition group-hover:-translate-y-1 group-hover:bg-brand-pink/15" aria-hidden="true">{item.emoji}</span>
              {item.label}
            </a>
          </li>)}
        </ul>
      </div>
    </div>

    {images.length > 1 && <div className="relative flex justify-center gap-2 pb-2 pt-6 lg:absolute lg:inset-x-0 lg:bottom-6 lg:p-0">
      {images.map((src, i) => <button key={src + i} type="button" onClick={() => setIndex(i)} aria-label={`Show hero photo ${i + 1}`} aria-current={i === index}
        className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-brand-pink" : "w-2.5 bg-brand-pink/30 hover:bg-brand-pink/60 lg:bg-white/80"}`}/>)}
    </div>}
  </section>;
}
