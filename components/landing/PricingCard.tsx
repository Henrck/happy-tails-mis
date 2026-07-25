// Shared pricing card used by both Grooming (Diamond/Premium) and Boarding
// (Small/Big Kennels). Portrait photo badge, ribbon header, zebra-striped
// price rows with bold accent pricing, and an optional Policies button.
import Image from "next/image";

export type PriceTier = { label: string; price: string };

export default function PricingCard({
  label,
  subLines,
  imageSrc,
  imageAlt,
  tiers,
}: {
  label: string;
  subLines: string[];
  imageSrc: string;
  imageAlt: string;
  tiers: PriceTier[];
}) {
  return (
    <div className="h-full rounded-3xl overflow-hidden shadow-xl border-2 border-brand-pink-light bg-white flex flex-col">
      {/* Ribbon header — fixed min-height so Diamond (2 lines) and Premium
          (3 lines) cards still line up evenly side by side. */}
      <div className="bg-gradient-to-r from-brand-pink to-brand-pink-dark px-6 py-5 text-center text-white min-h-[112px] md:min-h-[128px] flex flex-col justify-center">
        <h3 className="text-2xl md:text-3xl font-bold tracking-wide">{label}</h3>
        {subLines.map((line, i) => (
          <p key={i} className={`mt-1 ${i === 0 ? "text-sm font-semibold" : "text-[11px] opacity-90"}`}>
            {line}
          </p>
        ))}
      </div>

      {/* Body: portrait photo badge + price table */}
      <div className="flex-1 flex flex-col items-center px-6 pt-6 pb-6">
        <div className="relative w-32 md:w-36 aspect-[3/4] rounded-2xl overflow-hidden shadow-lg border-4 border-white ring-1 ring-pink-100">
          <Image src={imageSrc} alt={imageAlt} fill className="object-cover" />
        </div>

        <div className="mt-5 w-full rounded-2xl bg-brand-tint p-4">
          {tiers.map((tier, i) => (
            <div
              key={tier.label}
              className={`flex items-center justify-between px-2 py-2.5 rounded-lg ${
                i % 2 === 0 ? "bg-white" : ""
              } ${i !== tiers.length - 1 ? "mb-1" : ""}`}
            >
              <span className="text-sm md:text-base font-semibold text-zinc-700">
                {tier.label}
              </span>
              <span className="text-lg md:text-xl font-extrabold text-brand-pink">
                {tier.price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
