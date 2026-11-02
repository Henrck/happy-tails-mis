// The public website reads active package names, inclusions and prices from
// Service Management. Nothing monetary is hard-coded into these cards.
import PricingCard, { type IncludeItem } from "./PricingCard";
import PoliciesInlineCard from "./PoliciesInlineCard";
import {
  PawHeaderIcon, DiamondHeaderIcon, CrownHeaderIcon, BathDryIcon,
  TrimIcon, ConditionerIcon, EarCleanIcon, NailTrimIcon, TeethBrushingIcon,
  HeartCupIcon, FragranceIcon, ClipboardIcon, AlertIcon,
} from "./pricing-icons";
import {
  activePackages, groomingTiers, packageInclusions,
  type PublicPricingCatalog,
} from "@/lib/landing/public-pricing";

function DecorativePaw() {
  return <svg viewBox="0 0 64 64" className="h-16 w-16" fill="currentColor" aria-hidden="true">
    <circle cx="17" cy="20" r="7" /><circle cx="32" cy="13" r="7" /><circle cx="47" cy="20" r="7" />
    <path d="M32 27c-10 0-19 8-19 18 0 8 6 13 14 13 3 0 4-3 5-3s2 3 5 3c8 0 14-5 14-13 0-10-9-18-19-18Z" />
  </svg>;
}
function DecorativeHeart() {
  return <svg viewBox="0 0 32 32" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <path d="M16 27S4 19 4 11a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 8-10 14-10 14Z" />
  </svg>;
}

function iconForInclusion(label: string): React.ReactNode {
  const name = label.toLowerCase();
  if (/bath|dry/.test(name)) return <BathDryIcon />;
  if (/hair|cut|trim|style/.test(name)) return <TrimIcon />;
  if (/condition/.test(name)) return <ConditionerIcon />;
  if (/ear/.test(name)) return <EarCleanIcon />;
  if (/nail/.test(name)) return <NailTrimIcon />;
  if (/teeth|tooth|brush/.test(name)) return <TeethBrushingIcon />;
  if (/pupucino|pupuccino|treat|anal/.test(name)) return <HeartCupIcon />;
  if (/fragrance|perfume/.test(name)) return <FragranceIcon />;
  return <PawHeaderIcon />;
}

function packageStyle(name: string, images: { basic?: string | null; diamond?: string | null; premium?: string | null }) {
  const key = name.trim().toLowerCase();
  if (key.includes("diamond")) return {
    icon: <DiamondHeaderIcon />,
    tagline: "Our complete grooming and pampering experience.",
    image: images.diamond || "/images/pomeranian.png",
  };
  if (key.includes("premium")) return {
    icon: <CrownHeaderIcon />,
    tagline: "Specialty grooming and coat care for your pet.",
    image: images.premium || "/images/poodle.png",
  };
  return {
    icon: <PawHeaderIcon />,
    tagline: key.includes("basic") ? "Essential care to keep your pet clean and fresh." : "Gentle, professional grooming for your pet.",
    image: images.basic || "/images/pomeranian.png",
  };
}

export default function GroomingPricing({ basicImage, diamondImage, premiumImage, catalog }: {
  basicImage?: string | null;
  diamondImage?: string | null;
  premiumImage?: string | null;
  catalog: PublicPricingCatalog;
}) {
  const dogs = activePackages(catalog, "dog_grooming");
  const images = { basic: basicImage, diamond: diamondImage, premium: premiumImage };

  const renderCards = (packages: typeof dogs) => (
    <div className="mt-5 grid grid-cols-1 items-stretch gap-5 md:mt-6 md:gap-6 lg:grid-cols-3">
      {packages.map(pkg => {
        const style = packageStyle(pkg.name, images);
        const included: IncludeItem[] = packageInclusions(catalog, pkg.id)
          .map(label => ({ label, icon: iconForInclusion(label) }));
        const tiers = groomingTiers(catalog, pkg.id);
        return <PricingCard key={pkg.id}
          headerIcon={style.icon}
          label={pkg.name.toUpperCase()}
          tagline={style.tagline}
          imageSrc={style.image}
          imageAlt={`${pkg.name} pet grooming service`}
          includes={included}
          tiers={tiers.length ? tiers : [{ label: "Rate details are being updated", price: "—" }]} />;
      })}
    </div>
  );

  return (
    <section className="relative overflow-hidden bg-brand-tint py-8 md:py-9 lg:py-10">
      <div className="pointer-events-none absolute left-5 top-20 rotate-[-12deg] text-brand-pink-light/40"><DecorativeHeart /></div>
      <div className="pointer-events-none absolute right-8 top-10 rotate-[12deg] text-brand-pink-light/40"><DecorativeHeart /></div>
      <div className="pointer-events-none absolute bottom-7 left-8 rotate-[-12deg] text-brand-pink-light/25"><DecorativePaw /></div>
      <div className="pointer-events-none absolute bottom-7 right-8 rotate-[12deg] text-brand-pink-light/25"><DecorativePaw /></div>
      <div className="site-container relative z-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3 text-brand-pink-dark">
            <span className="text-brand-pink [&>svg]:h-7 [&>svg]:w-7"><PawHeaderIcon /></span>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight md:text-4xl lg:text-[2.7rem]">Grooming Services</h2>
            <span className="text-brand-pink-light [&>svg]:h-8 [&>svg]:w-8"><DecorativeHeart /></span>
          </div>
          <p className="mt-2 text-sm text-zinc-700 md:text-base">Care tailored to your pet&apos;s needs. Clean, happy, and ready to shine!</p>
        </header>
        {!catalog.loaded ? (
          <p role="status" className="mx-auto mt-6 max-w-xl rounded-xl bg-white p-4 text-center text-sm text-zinc-700">
            Grooming prices are temporarily unavailable. Please contact HappyTails for current rates.
          </p>
        ) : dogs.length === 0 ? (
          <p className="mt-6 text-center text-sm text-zinc-600">Grooming packages are currently being updated.</p>
        ) : renderCards(dogs)}
        <div className="mx-auto mt-6 max-w-5xl">
          <PoliciesInlineCard items={[
            { icon: <ClipboardIcon />, text: "Prices may vary depending on your pet's condition and coat." },
            { icon: <AlertIcon />, text: "Additional charges may apply for severe matting or fleas." },
            { icon: <PawHeaderIcon />, text: "Please inform us of any medical conditions or special needs." },
          ]} />
        </div>
      </div>
    </section>
  );
}
