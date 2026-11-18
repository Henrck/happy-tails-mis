// About Us (photo beside the story) followed by the FAQs (heading column + accordion).
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import type { FAQItem } from "@/lib/website/faq";

const PILLARS = [
  { emoji: "✂️", label: "Grooming" },
  { emoji: "🏠", label: "Boarding" },
  { emoji: "🛍️", label: "Pet supplies" },
  { emoji: "☕", label: "Pet café" },
];

export function HomeAbout({ imageUrl, heading, description }: { imageUrl?: string | null; heading: string; description: string }) {
  return <section id="about" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[30px] bg-[#F3E7EE] sm:aspect-[5/4] lg:aspect-[4/5]">
          <Image src={imageUrl || "/images/about-bg.png"} alt="Happy Tails pets and their owners" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" unoptimized={!!imageUrl}/>
        </div>
        <div className="absolute -bottom-5 left-5 right-5 rounded-2xl bg-white p-4 shadow-[0_18px_40px_-18px_rgba(42,22,38,0.45)] sm:left-auto sm:right-6 sm:w-64">
          <p className="font-heading text-lg font-bold text-[#2A1626]">Happy Tails</p>
          <p className="text-xs text-zinc-500">Pet Grooming Café · Noveleta, Cavite</p>
        </div>
      </div>
      <div className="pt-6 lg:pt-0">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pink">Our story</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#2A1626] sm:text-5xl">{heading}</h2>
        <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-zinc-600">{description}</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PILLARS.map((item) => <li key={item.label} className="rounded-2xl border border-pink-100 bg-white px-3 py-4 text-center">
            <span className="text-2xl" aria-hidden="true">{item.emoji}</span>
            <span className="mt-1 block text-xs font-bold text-zinc-700">{item.label}</span>
          </li>)}
        </ul>
      </div>
    </div>
  </section>;
}

export function HomeFaq({ items, heading, subheading }: { items: FAQItem[]; heading: string; subheading: string }) {
  const published = items.filter((item) => item.published && item.question.trim() && item.answer.trim());
  if (!published.length) return null;
  return <section id="faq" aria-labelledby="faq-heading" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
    <div className="grid gap-10 lg:grid-cols-[0.8fr_1.6fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pink">Helpful answers</p>
        <h2 id="faq-heading" className="mt-3 text-4xl font-bold tracking-tight text-[#2A1626] sm:text-5xl">{heading}</h2>
        <p className="mt-3 text-base text-zinc-500">{subheading}</p>
        <div className="mt-7 rounded-[22px] bg-brand-tint p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-[#2A1626]"><MessageCircle size={17} className="text-brand-pink"/> Still have a question?</p>
          <p className="mt-1 text-sm text-zinc-600">Our team is happy to help.</p>
          <Link href="#footer" className="mt-3 inline-block text-sm font-bold text-brand-pink hover:underline">Contact us</Link>
        </div>
      </div>
      <div className="space-y-2.5">
        {published.map((item, i) => <details key={item.id} className="group relative overflow-hidden rounded-[20px] border border-pink-100/80 bg-white/60 transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-200 hover:bg-white hover:shadow-[0_16px_36px_-20px_rgba(212,43,124,0.45)] open:border-pink-200 open:bg-white open:shadow-[0_16px_36px_-20px_rgba(212,43,124,0.35)]">
          <span aria-hidden="true" className="absolute inset-y-4 left-0 w-1 origin-center scale-y-0 rounded-r-full bg-brand-pink transition-transform duration-300 group-hover:scale-y-100 group-open:scale-y-100"/>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 text-left text-base font-bold text-[#2A1626] transition-colors group-hover:text-brand-pink sm:px-6 marker:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink sm:text-lg [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-baseline gap-3"><span className="font-heading text-sm text-brand-pink/50 transition-colors group-hover:text-brand-pink">{String(i + 1).padStart(2, "0")}</span><span>{item.question}</span></span>
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pink-200 text-brand-pink transition-all duration-300 group-hover:scale-110 group-hover:border-brand-pink group-hover:bg-brand-tint group-open:rotate-45 group-open:border-brand-pink group-open:bg-brand-pink group-open:text-white"><Plus size={16}/></span>
          </summary>
          <p className="whitespace-pre-line break-words px-5 pb-5 pl-[3.25rem] pr-12 text-[15px] leading-7 text-zinc-600 sm:px-6 sm:pl-14">{item.answer}</p>
        </details>)}
      </div>
    </div>
  </section>;
}
