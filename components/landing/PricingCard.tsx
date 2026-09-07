// Shared pricing card used by Grooming (Basic/Diamond/Premium) and
// Boarding (Small/Big Kennels). Redesigned to match the reference
// images: a photo built into the header via a diagonal cut (desktop) —
// simplified to a plain stacked photo on mobile, where a diagonal cut
// has no room to breathe — an optional "Includes" icon row (Grooming
// only; Boarding passes nothing and skips it), then the price list.
import Image from "next/image";

export type PriceTier = { label: string; price: string };
export type IncludeItem = { icon: React.ReactNode; label: string };

export default function PricingCard({
  headerIcon,
  label,
  badge,
  description,
  imageSrc,
  imageAlt,
  includes,
  tiers,
}: {
  headerIcon: React.ReactNode;
  label: string;
  badge?: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  includes?: IncludeItem[];
  tiers: PriceTier[];
}) {
  return (
    <div className="h-full rounded-3xl overflow-hidden shadow-xl bg-white flex flex-col">
      {/* Mobile header: plain stacked photo, no diagonal — a diagonal cut
          has no room to read cleanly at narrow widths. */}
      <div className="md:hidden">
        <div className="relative w-full aspect-[16/10]">
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
        </div>
        <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            {headerIcon}
            <h3 className="text-xl font-bold tracking-wide">{label}</h3>
          </div>
          {badge && (
            <span className="mt-2 inline-block bg-white/20 rounded-full px-3 py-0.5 text-[11px] font-medium">
              {badge}
            </span>
          )}
          <p className="mt-2 text-xs leading-relaxed opacity-90">{description}</p>
        </div>
      </div>

      {/* Desktop header: diagonal photo cut into the pink ribbon. */}
      <div className="hidden md:block relative min-h-[180px] bg-gradient-to-r from-brand-pink to-brand-pink-dark overflow-hidden">
        <div className="relative z-10 max-w-[58%] px-6 py-6">
          <div className="flex items-center gap-2 text-white">
            {headerIcon}
            <h3 className="text-2xl font-bold tracking-wide">{label}</h3>
          </div>
          {badge && (
            <span className="mt-2 inline-block bg-white/20 text-white rounded-full px-3 py-0.5 text-xs font-medium">
              {badge}
            </span>
          )}
          <p className="mt-3 text-xs leading-relaxed text-white/90">{description}</p>
        </div>
        <div
          className="absolute inset-y-0 right-0 w-[46%]"
          style={{ clipPath: "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
        >
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
        </div>
      </div>

      {/* Body: optional includes row + price table */}
      <div className="flex-1 flex flex-col px-5 md:px-6 pt-5 pb-6">
        {includes && includes.length > 0 && (
          <>
            <p className="text-center text-xs font-bold tracking-wide text-brand-pink">
              INCLUDES:
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-3">
              {includes.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1 w-16">
                  <div className="w-9 h-9 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink">
                    {item.icon}
                  </div>
                  <span className="text-[10px] leading-tight text-center text-zinc-500">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={`w-full rounded-2xl bg-brand-tint p-4 ${includes ? "mt-5" : ""}`}>
          {tiers.map((tier, i) => (
            <div
              key={tier.label}
              className={`flex items-center justify-between px-2 py-2.5 rounded-lg ${
                i % 2 === 0 ? "bg-white" : ""
              } ${i !== tiers.length - 1 ? "mb-1" : ""}`}
            >
              <span className="text-xs md:text-sm font-semibold text-zinc-700">
                {tier.label}
              </span>
              <span className="text-base md:text-lg font-extrabold text-brand-pink shrink-0 ml-2">
                {tier.price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
