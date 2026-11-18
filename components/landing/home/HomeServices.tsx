"use client";
// Services explorer: one tab per published service. Each tab shows the
// service photo and story, then its live packages and prices from Service Management.
import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Check } from "lucide-react";
import type { WebsiteService } from "@/lib/website/catalog";

export type ServicePanel = {
  service: WebsiteService;
  /** Longer copy from the service banner in Website Management. */
  story?: string;
  highlights: string[];
  /** Packages and prices (or benefits) shown under the intro. */
  details?: ReactNode;
};

const ICONS: Record<string, string> = { bath: "🛁", home: "🏠", sparkles: "✨", paw: "🐾" };

export default function HomeServices({ panels, heading, subheading }: { panels: ServicePanel[]; heading: string; subheading: string }) {
  const [active, setActive] = useState(panels[0]?.service.slug ?? "");
  if (!panels.length) return null;

  return <section id="services" className="py-20 lg:py-24">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-pink">What we do</p>
        <h2 className="mt-3 text-4xl font-bold tracking-tight text-[#2A1626] sm:text-5xl">{heading}</h2>
        <p className="mx-auto mt-3 max-w-lg text-base text-zinc-500">{subheading}</p>
      </div>

      <div role="tablist" aria-label="Services" className="mx-auto mt-9 flex w-full max-w-xl gap-1.5 rounded-full border border-pink-100 bg-white p-1.5 shadow-sm">
        {panels.map(({ service }) => {
          const selected = service.slug === active;
          return <button key={service.id} type="button" role="tab" id={`tab-${service.slug}`} aria-selected={selected} aria-controls={`panel-${service.slug}`}
            onClick={() => setActive(service.slug)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-bold transition ${selected ? "bg-brand-pink text-white shadow" : "text-zinc-600 hover:text-brand-pink"}`}>
            <span aria-hidden="true">{ICONS[service.icon_key] ?? ICONS.paw}</span>
            <span className="truncate">{service.title.replace(/^pet\s+/i, "")}</span>
          </button>;
        })}
      </div>
    </div>

    {panels.map(({ service, story, highlights, details }) => <div key={service.id} role="tabpanel" id={`panel-${service.slug}`} aria-labelledby={`tab-${service.slug}`} hidden={service.slug !== active}>
      <div className="mx-auto mt-12 grid max-w-6xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-2">
        <div className="relative aspect-[5/4] overflow-hidden rounded-[30px] bg-[#F3E7EE]">
          {service.image_url && <Image src={service.image_url} alt={service.title} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" unoptimized={service.image_url.startsWith("http")}/>}
        </div>
        <div>
          <h3 className="text-3xl font-bold text-[#2A1626] sm:text-4xl">{service.title}</h3>
          <p className="mt-4 text-base leading-relaxed text-zinc-600">{service.description}</p>
          {story && story !== service.description && <p className="mt-3 text-base leading-relaxed text-zinc-600">{story}</p>}
          {highlights.length > 0 && <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {highlights.map((item) => <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-zinc-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand-pink"><Check size={14} strokeWidth={3}/></span>{item}
            </li>)}
          </ul>}
          <Link href="/account/appointments" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2A1626] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#3d2138]">
            Book {service.title.toLowerCase()} <CalendarDays size={16}/>
          </Link>
        </div>
      </div>
      {details && <div className="mt-14">{details}</div>}
    </div>)}
  </section>;
}
