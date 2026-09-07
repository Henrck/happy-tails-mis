// Grooming pricing: Basic / Diamond / Premium.
// The section follows the reference card layout while keeping the shared
// PricingCard reusable for the other landing-page pricing sections.
import PricingCard from "./PricingCard";
import PoliciesInlineCard from "./PoliciesInlineCard";
import {
  PawHeaderIcon,
  DiamondHeaderIcon,
  CrownHeaderIcon,
  BathDryIcon,
  TrimIcon,
  ConditionerIcon,
  EarCleanIcon,
  NailTrimIcon,
  TeethBrushingIcon,
  HeartCupIcon,
  FragranceIcon,
  ClipboardIcon,
  AlertIcon,
  PawHeaderIcon as MedicalPawIcon,
} from "./pricing-icons";

const basicTiers = [
  { label: "SMALL (Below 5 kg)", price: "₱450" },
  { label: "MEDIUM (5 - 12 kg)", price: "₱550" },
  { label: "LARGE (12 - 17 kg)", price: "₱750" },
  { label: "EXTRA LARGE (17 - 29 kg)", price: "₱950" },
  { label: "2 EXTRA LARGE (Above 29 kg)", price: "₱1100" },
];

const diamondTiers = [
  { label: "SMALL (Below 5 kg)", price: "₱750" },
  { label: "MEDIUM (5 - 12 kg)", price: "₱850" },
  { label: "LARGE (12 - 17 kg)", price: "₱1100" },
  { label: "EXTRA LARGE (17 - 29 kg)", price: "₱1350" },
  { label: "2 EXTRA LARGE (Above 29 kg)", price: "₱1500" },
];

const premiumTiers = [
  { label: "SMALL (Below 5 kg)", price: "₱650" },
  { label: "MEDIUM (5 - 12 kg)", price: "₱770" },
  { label: "LARGE (12 - 17 kg)", price: "₱1000" },
  { label: "EXTRA LARGE (17 - 29 kg)", price: "₱1250" },
  { label: "2 EXTRA LARGE (Above 29 kg)", price: "₱1400" },
];

function DecorativePaw() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="currentColor" aria-hidden="true">
      <circle cx="17" cy="20" r="7" />
      <circle cx="32" cy="13" r="7" />
      <circle cx="47" cy="20" r="7" />
      <path d="M32 27c-10 0-19 8-19 18 0 8 6 13 14 13 3 0 4-3 5-3s2 3 5 3c8 0 14-5 14-13 0-10-9-18-19-18Z" />
    </svg>
  );
}

function DecorativeHeart() {
  return (
    <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M16 27S4 19 4 11a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-10 14-10 14Z" />
    </svg>
  );
}

export default function GroomingPricing() {
  return (
    <section className="relative overflow-hidden bg-brand-tint py-12 md:py-14 lg:py-16">
      {/* Soft decorative marks from the reference */}
      <div className="pointer-events-none absolute left-5 top-20 text-brand-pink-light/40 rotate-[-12deg]">
        <DecorativeHeart />
      </div>
      <div className="pointer-events-none absolute right-8 top-10 text-brand-pink-light/40 rotate-[12deg]">
        <DecorativeHeart />
      </div>
      <div className="pointer-events-none absolute bottom-7 left-8 text-brand-pink-light/25 rotate-[-12deg]">
        <DecorativePaw />
      </div>
      <div className="pointer-events-none absolute bottom-7 right-8 text-brand-pink-light/25 rotate-[12deg]">
        <DecorativePaw />
      </div>

      <div className="site-container relative z-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3 text-brand-pink-dark">
            <span className="text-brand-pink [&>svg]:h-7 [&>svg]:w-7" aria-hidden="true">
              <PawHeaderIcon />
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-[3rem] font-extrabold uppercase tracking-tight leading-none">
              Grooming Services
            </h2>
            <span className="text-brand-pink-light [&>svg]:h-8 [&>svg]:w-8" aria-hidden="true">
              <DecorativeHeart />
            </span>
          </div>
          <p className="mt-3 text-sm md:text-base lg:text-lg text-zinc-700">
            Care tailored to your pet&apos;s needs. Clean, happy, and ready to shine!
          </p>
        </header>

        <div className="mt-7 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 items-stretch">
          <PricingCard
            headerIcon={<PawHeaderIcon />}
            label="BASIC GROOMING"
            tagline="Essential care to keep your pet clean and fresh."
            imageSrc="/images/pomeranian.png"
            imageAlt="Freshly groomed Pomeranian after a basic grooming session"
            includes={[
              { icon: <BathDryIcon />, label: "Bath & blow dry" },
              { icon: <TrimIcon />, label: "Basic trim" },
              { icon: <EarCleanIcon />, label: "Ear cleaning" },
              { icon: <FragranceIcon />, label: "Fragrance" },
            ]}
            tiers={basicTiers}
          />

          <PricingCard
            headerIcon={<DiamondHeaderIcon />}
            label="DIAMOND"
            badge="All coat / all styles applies."
            tagline="Bath & dry, hair cut, conditioner, ear clean, nail trim, teeth brushing, anal sac + pupucino."
            imageSrc="/images/pomeranian.png"
            imageAlt="Pomeranian groomed with the Diamond package"
            includes={[
              { icon: <BathDryIcon />, label: "Bath & dry" },
              { icon: <TrimIcon />, label: "Hair cut" },
              { icon: <ConditionerIcon />, label: "Conditioner" },
              { icon: <EarCleanIcon />, label: "Ear clean" },
              { icon: <NailTrimIcon />, label: "Nail trim" },
              { icon: <TeethBrushingIcon />, label: "Teeth brushing" },
              { icon: <HeartCupIcon />, label: "Anal sac + pupucino" },
            ]}
            tiers={diamondTiers}
          />

          <PricingCard
            headerIcon={<CrownHeaderIcon />}
            label="PREMIUM"
            badge="Double coated, long / curly haired"
            tagline="Specialty cut, Asian fusion, puppy cut, teddy style, bath & dry, hair cut, conditioner, ear clean, nail trim, teeth brushing, anal sac + pupucino."
            imageSrc="/images/poodle.png"
            imageAlt="Toy poodle groomed with the Premium package"
            includes={[
              { icon: <BathDryIcon />, label: "Bath & dry" },
              { icon: <TrimIcon />, label: "Specialty cut" },
              { icon: <ConditionerIcon />, label: "Conditioner" },
              { icon: <EarCleanIcon />, label: "Ear clean" },
              { icon: <NailTrimIcon />, label: "Nail trim" },
              { icon: <TeethBrushingIcon />, label: "Teeth brushing" },
              { icon: <HeartCupIcon />, label: "Anal sac + pupucino" },
            ]}
            tiers={premiumTiers}
          />
        </div>

        <div className="mx-auto mt-8 max-w-5xl">
          <PoliciesInlineCard
            items={[
              {
                icon: <ClipboardIcon />,
                text: "Prices may vary depending on your pet's condition and coat.",
              },
              {
                icon: <AlertIcon />,
                text: "Additional charges may apply for severe matting or fleas.",
              },
              {
                icon: <MedicalPawIcon />,
                text: "Please inform us of any medical conditions or special needs.",
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
