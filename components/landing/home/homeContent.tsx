// Shared by the public homepage and the Website Management preview, so both
// build the services tabs and closing banner from the same data the same way.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GroomingPricing from "@/components/landing/GroomingPricing";
import BoardingPricing from "@/components/landing/BoardingPricing";
import { SPA_BENEFITS } from "@/components/landing/SpaBenefits";
import { copy, serviceHighlights, SERVICE_FALLBACK_IMAGES, type WebsitePackageMedia, type WebsiteService } from "@/lib/website/catalog";
import type { PublicPricingCatalog } from "@/lib/landing/public-pricing";
import type { SiteSetting } from "@/lib/supabase/site-settings";
import type { ServicePanel } from "./HomeServices";

const SETTING_IMAGE: Record<string, string> = {
  "pet-grooming": "services_grooming_image", "pet-boarding": "services_boarding_image", "pet-spa": "services_spa_image",
};
const STORY_KEY: Record<string, string> = {
  "pet-grooming": "grooming_banner_description", "pet-boarding": "boarding_banner_description", "pet-spa": "spa_banner_description",
};

// Reuses the pricing cards, without their own section header and backdrop.
function PricingBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return <div>
    <h4 className="mx-auto max-w-6xl px-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-zinc-400 sm:px-8">{title}</h4>
    <div className="mt-2 [&>section]:!bg-transparent [&>section]:!pb-0 [&>section>.pointer-events-none]:hidden [&>section>div>header]:hidden">{children}</div>
  </div>;
}

export function buildServicePanels({ services, text, catalog, media, settings }: {
  services: WebsiteService[];
  text: Record<string, string>;
  catalog: PublicPricingCatalog;
  media: WebsitePackageMedia[];
  settings: SiteSetting[];
}): ServicePanel[] {
  const image = (key: string) => settings.find((s) => s.key === key)?.image_url ?? undefined;
  const details: Record<string, React.ReactNode> = {
    "pet-grooming": <PricingBlock title={copy("grooming_heading", text)}>
      <GroomingPricing catalog={catalog} media={media} basicImage={image("grooming_basic_image")} diamondImage={image("grooming_diamond_image")} premiumImage={image("grooming_premium_image")}/>
    </PricingBlock>,
    "pet-boarding": <PricingBlock title={copy("boarding_heading", text)}>
      <BoardingPricing catalog={catalog} media={media} smallKennelImage={image("boarding_small_kennel_image")} bigKennelImage={image("boarding_big_kennel_image")}/>
    </PricingBlock>,
    "pet-spa": <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <h4 className="text-center text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Pet Spa Ayurveda benefits</h4>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPA_BENEFITS.map((benefit, i) => <li key={benefit.title} className="rounded-[22px] border border-pink-100 bg-white p-5">
          <span className="font-heading text-sm font-bold text-brand-pink">{String(i + 1).padStart(2, "0")}</span>
          <h5 className="mt-1 text-lg font-bold text-[#2A1626]">{benefit.title}</h5>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{benefit.description}</p>
        </li>)}
      </ul>
    </div>,
  };
  return services.map((service) => ({
    service: { ...service, image_url: service.image_url ?? image(SETTING_IMAGE[service.slug] ?? "") ?? SERVICE_FALLBACK_IMAGES[service.slug] ?? null },
    story: STORY_KEY[service.slug] ? copy(STORY_KEY[service.slug], text) : undefined,
    highlights: serviceHighlights(service.slug, text),
    details: details[service.slug],
  }));
}

export function HomeCta({ text }: { text: Record<string, string> }) {
  return <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
    <div className="rounded-[30px] bg-brand-pink px-6 py-14 text-center text-white sm:px-10">
      <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">{copy("cta_heading", text)}</h2>
      <p className="mx-auto mt-3 max-w-md text-base text-white/85">{copy("cta_description", text)}</p>
      <Link href="/account/appointments" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand-pink shadow-lg shadow-black/10 hover:bg-pink-50">
        Book an appointment <ArrowRight size={17}/>
      </Link>
    </div>
  </section>;
}
