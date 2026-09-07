// Shared pricing card used by Grooming (Basic/Diamond/Premium) and
// Boarding (Small/Big Kennels).
//
// Redesign pass 2 — the first pass crammed a full ingredient-list
// paragraph into the colored header on top of a photo, which made every
// card a different height and felt visually noisy. Fixed here:
//   - header now takes a short tagline instead of a paragraph (the
//     "Includes" icons already say what's in the package — repeating it
//     as prose above them was redundant, not informative)
//   - a thin white seam separates the photo from the pink, instead of a
//     hard clip edge
//   - includes icons sit in a proper ring instead of a flat tint circle
//   - each price row gets a small tag icon, closer to the reference
//   - a subtle hover lift, since these are the kind of cards people
//     scan and compare
import Image from "next/image";

export type PriceTier = { label: string; price: string };
export type IncludeItem = { icon: React.ReactNode; label: string };

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.6 12.3 12.7 20a1.5 1.5 0 0 1-2.1 0l-6.6-6.6a1.5 1.5 0 0 1 0-2.1L11.7 3.6a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v5.9a2 2 0 0 1-.4 1.4z" />
      <circle cx="16" cy="8" r="1.3" />
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
    <div className="h-full rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 bg-white flex flex-col">
      {/* Mobile header: plain stacked photo, no diagonal — a diagonal cut
          has no room to read cleanly at narrow widths. */}
      <div className="md:hidden">
        <div className="relative w-full aspect-[16/9]">
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
        </div>
        <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            {headerIcon}
            <h3 className="text-xl font-bold tracking-wide">{label}</h3>
          </div>
          {badge && (
            <span className="mt-2 inline-block bg-white/15 border border-white/30 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {badge}
            </span>
          )}
          <p className="mt-2 text-xs text-white/90">{tagline}</p>
        </div>
      </div>

      {/* Desktop header: diagonal photo cut into the pink ribbon, with a
          thin white seam between them and a short tagline instead of a
          full paragraph — keeps every card the same height regardless
          of how much copy the tier needs. */}
      <div className="hidden md:flex relative h-[130px] bg-gradient-to-br from-brand-pink to-brand-pink-dark overflow-hidden items-center">
        <div className="relative z-10 max-w-[56%] px-6">
          <div className="flex items-center gap-2 text-white">
            {headerIcon}
            <h3 className="text-xl lg:text-2xl font-bold tracking-wide leading-tight">{label}</h3>
          </div>
          {badge ? (
            <span className="mt-2 inline-block bg-white/15 border border-white/30 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
              {badge}
            </span>
          ) : (
            <p className="mt-1.5 text-xs text-white/90 leading-snug">{tagline}</p>
          )}
        </div>

        {/* White seam, 3px wider than the photo itself */}
        <div
          className="absolute inset-y-0 right-0 w-[46%] bg-white"
          style={{ clipPath: "polygon(calc(18% - 3px) 0%, 100% 0%, 100% 100%, calc(0% - 3px) 100%)" }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[46%]"
          style={{ clipPath: "polygon(18% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
        >
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
        </div>
      </div>

      {/* Body: optional includes row + price table */}
      <div className="flex-1 flex flex-col px-5 md:px-6 pt-6 pb-6">
        {includes && includes.length > 0 && (
          <>
            <p className="text-center text-xs font-bold tracking-wide text-brand-pink">
              INCLUDES:
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-4">
              {includes.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1.5 w-[4.6rem]">
                  <div className="w-11 h-11 rounded-full bg-white ring-2 ring-pink-100 flex items-center justify-center text-brand-pink">
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

        <div className={`w-full rounded-2xl bg-brand-tint p-4 ${includes ? "mt-6" : ""}`}>
          {tiers.map((tier, i) => (
            <div
              key={tier.label}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg ${
                i % 2 === 0 ? "bg-white" : ""
              } ${i !== tiers.length - 1 ? "mb-1" : ""}`}
            >
              <span className="flex items-center gap-2 text-xs md:text-sm font-semibold text-zinc-700">
                <span className="text-brand-pink-light"><TagIcon /></span>
                {tier.label}
              </span>
              <span className="text-base md:text-lg font-extrabold text-brand-pink shrink-0">
                {tier.price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
