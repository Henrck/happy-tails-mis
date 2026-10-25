import Image from "next/image";

export type PriceTier = { label: string; price: string };
export type IncludeItem = { icon: React.ReactNode; label: string };

function WeightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 5h8" />
      <path d="M9 5 7 8h10l-2-3" />
      <path d="M6.5 8h11a1 1 0 0 1 1 1l1 10a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19l1-10a1 1 0 0 1 1-1Z" />
      <path d="M12 11v3" />
      <path d="M10.5 12.5h3" />
    </svg>
  );
}

export default function PricingCard({ headerIcon, label, badge, tagline, imageSrc, imageAlt, includes, tiers }: {
  headerIcon: React.ReactNode;
  label: string;
  badge?: string;
  tagline: string;
  imageSrc: string;
  imageAlt: string;
  includes?: IncludeItem[];
  tiers: PriceTier[];
}) {
  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-brand-pink-light/70 bg-white shadow-[0_6px_20px_rgba(245,61,147,0.10)] transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(245,61,147,0.16)]">
      {/* The desktop text and image have independent columns. Unlike the old
          absolute overlay, the image can never cover the description. */}
      <div className="hidden min-h-[216px] grid-cols-[minmax(0,58%)_minmax(0,42%)] overflow-hidden bg-gradient-to-br from-brand-pink to-brand-pink-dark md:grid">
        <div className="relative z-10 flex min-w-0 flex-col justify-center gap-2 py-5 pl-4 pr-2 text-white lg:pl-5">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 [&>svg]:h-5 [&>svg]:w-5">{headerIcon}</span>
            <h3 className="min-w-0 break-words text-[1.12rem] font-bold leading-tight tracking-tight lg:text-[1.28rem]">{label}</h3>
          </div>
          {badge && <span className="max-w-full self-start rounded-xl border border-white/80 bg-white/10 px-2 py-1 text-[10px] leading-snug break-words">{badge}</span>}
          <p className="min-w-0 text-[11px] leading-[1.55] break-words text-white/95">{tagline}</p>
        </div>
        <div className="relative min-h-[216px] min-w-0 overflow-hidden" style={{ clipPath: "polygon(12% 0%, 100% 0%, 100% 100%, 0% 100%)" }}>
          <Image src={imageSrc} alt={imageAlt} fill sizes="(min-width: 1024px) 16vw, 40vw" className="object-cover" />
        </div>
      </div>

      <div className="md:hidden">
        <div className="relative h-[170px] w-full">
          <Image src={imageSrc} alt={imageAlt} fill sizes="100vw" className="object-cover" />
        </div>
        <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-5 py-5 text-white">
          <div className="flex items-center gap-2">
            <span className="shrink-0 [&>svg]:h-6 [&>svg]:w-6">{headerIcon}</span>
            <h3 className="text-xl font-bold leading-tight">{label}</h3>
          </div>
          {badge && <span className="mt-3 inline-block max-w-full rounded-full border border-white/70 bg-white/10 px-3 py-1 text-[10px] font-medium leading-snug">{badge}</span>}
          <p className="mt-2 text-xs leading-relaxed text-white/95">{tagline}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-3.5 pt-4 md:px-4 md:pb-3.5 md:pt-4">
        {includes && includes.length > 0 && (
          <>
            <div className="flex justify-center">
              <span className="rounded-full bg-brand-tint px-3.5 py-1 text-[11px] font-bold tracking-wide text-brand-pink">INCLUDES:</span>
            </div>
            <div className={`mt-4 grid w-full items-start ${includes.length > 5 ? "grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-7 sm:gap-x-0.5" : "grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4"}`}>
              {includes.map((item) => (
                <div key={item.label} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                  <div className={`flex items-center justify-center text-brand-pink ${includes.length > 5 ? "h-8 w-8 [&>svg]:h-6 [&>svg]:w-6" : "h-9 w-9 [&>svg]:h-7 [&>svg]:w-7"}`}>{item.icon}</div>
                  <span className={`w-full break-words leading-[1.15] text-zinc-600 ${includes.length > 5 ? "text-[9px] sm:text-[8px]" : "text-[10px] sm:text-[9px]"}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
        <div className={`${includes ? "mt-4" : "mt-0"} space-y-1.5`}>
          {tiers.map((tier) => (
            <div key={tier.label} className="flex min-h-[40px] items-center justify-between gap-3 rounded-[10px] bg-gradient-to-r from-brand-tint to-white px-3 py-1.5">
              <span className="flex min-w-0 items-center gap-2 text-[11px] font-medium leading-tight text-zinc-700 md:text-[12px]">
                <span className="shrink-0 text-brand-pink-light"><WeightIcon /></span>
                <span>{tier.label}</span>
              </span>
              <span className="shrink-0 text-[15px] font-extrabold text-brand-pink md:text-[16px]">{tier.price}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
