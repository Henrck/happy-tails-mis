import Image from "next/image";

export type PriceTier = { label: string; price: string };
export type IncludeItem = { icon: React.ReactNode; label: string };

function WeightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 5h8" />
      <path d="M9 5 7 8h10l-2-3" />
      <path d="M6.5 8h11a1 1 0 0 1 1 1l1 10a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19l1-10a1 1 0 0 1 1-1Z" />
      <path d="M12 11v3" />
      <path d="M10.5 12.5h3" />
    </svg>
  );
}

export default function PricingCard({
  headerIcon,
  label,
  badge,
  tagline,
  imageSrc,
  imageAlt,
  includes,
  tiers,
}: {
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
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-brand-pink-light/70 bg-white shadow-[0_6px_24px_-4px_rgba(236,56,152,0.10),0_2px_8px_-2px_rgba(17,24,39,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-8px_rgba(236,56,152,0.16),0_6px_14px_-4px_rgba(17,24,39,0.06)]">
      {/* Compact split banner: package details on the left, pet photo on the right. */}
      <div className="relative grid min-h-[166px] shrink-0 grid-cols-[minmax(0,58%)_minmax(0,42%)] overflow-hidden bg-gradient-to-br from-[#F2419E] via-brand-pink to-brand-pink-dark sm:min-h-[180px] lg:min-h-[190px]">
        <div className="relative z-10 flex min-w-0 flex-col justify-center gap-2 px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-white [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
              {headerIcon}
            </span>
            <h3 className="min-w-0 break-words text-[1rem] font-extrabold leading-tight tracking-wide sm:text-lg lg:text-xl">
              {label}
            </h3>
          </div>

          {badge && (
            <span className="max-w-full self-start rounded-full border border-white/45 bg-white/10 px-2.5 py-1 text-[9px] font-semibold leading-snug text-white sm:text-[10px]">
              {badge}
            </span>
          )}

          <p className="line-clamp-3 min-w-0 text-[10px] leading-relaxed text-white/95 sm:text-[11px] sm:leading-[1.55]">
            {tagline}
          </p>
        </div>

        <div className="relative min-h-[166px] min-w-0 overflow-hidden sm:min-h-[180px] lg:min-h-[190px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 14vw, (min-width: 768px) 21vw, 42vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-pink/80 via-brand-pink/20 to-transparent" />
        </div>
      </div>

      {/* Fixed inclusion area keeps the pricing rows aligned across cards. */}
      <div className="flex flex-1 flex-col px-4 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
        {includes && includes.length > 0 && (
          <section aria-label="Package inclusions">
            <div className="flex justify-center">
              <span className="rounded-full border border-brand-pink-light/60 bg-brand-tint px-4 py-1 text-[10px] font-bold tracking-wider text-brand-pink sm:text-[11px]">
                INCLUDES:
              </span>
            </div>

            <div className="mt-4 min-h-[154px] sm:min-h-[164px]">
              <div className="grid grid-cols-4 gap-x-1.5 gap-y-3 sm:gap-x-2 sm:gap-y-3.5">
                {includes.map((item) => (
                  <div key={item.label} className="flex min-w-0 flex-col items-center text-center">
                    <div className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-100 bg-brand-tint text-brand-pink shadow-sm transition-colors duration-150 hover:bg-brand-pink hover:text-white sm:h-10 sm:w-10 [&>svg]:h-5 [&>svg]:w-5">
                      {item.icon}
                    </div>
                    <span className="line-clamp-2 min-h-[2.35em] w-full break-words text-[9px] font-medium leading-[1.18] text-zinc-700 sm:text-[10px] sm:leading-tight">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Weight / kennel pricing remains sourced from the existing catalog. */}
        <div className={`${includes && includes.length > 0 ? "border-t border-zinc-100 pt-4" : ""} mt-auto`}>
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.label}
                className="flex min-h-[42px] items-center justify-between gap-2 rounded-xl border border-gray-100 bg-[#FAFAFC] px-3 py-2 transition-colors duration-150 hover:border-brand-pink-light/70 hover:bg-brand-tint/70 sm:px-3.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-[10px] font-medium leading-tight text-zinc-700 sm:gap-2.5 sm:text-xs">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand-pink-light/50 bg-white text-brand-pink/90">
                    <WeightIcon />
                  </span>
                  <span className="min-w-0 break-words">{tier.label}</span>
                </span>
                <span className="ml-2 shrink-0 whitespace-nowrap text-sm font-extrabold text-brand-pink sm:text-[15px]">
                  {tier.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
