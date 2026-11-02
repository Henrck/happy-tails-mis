// Boarding prices are sourced from active Service Management packages.
import PricingCard from "./PricingCard";
import PoliciesInlineCard from "./PoliciesInlineCard";
import {
  PawHeaderIcon, ClipboardIcon, ClockIcon, BackpackIcon, BathDryIcon, ShieldCheckIcon,
} from "./pricing-icons";
import { activePackages, boardingTiers, kennelPackageSize, type PublicPricingCatalog } from "@/lib/landing/public-pricing";

export default function BoardingPricing({ smallKennelImage, bigKennelImage, catalog }: {
  smallKennelImage?: string | null;
  bigKennelImage?: string | null;
  catalog: PublicPricingCatalog;
}) {
  const packages = activePackages(catalog, "boarding");
  const small = packages.filter(p => kennelPackageSize(p.name) === "small");
  const big = packages.filter(p => kennelPackageSize(p.name) === "big");
  const smallRates = boardingTiers(catalog, small.map(p => p.id));
  const bigRates = boardingTiers(catalog, big.map(p => p.id));
  const includes = [
    { icon: <BathDryIcon />, label: "Feeding" },
    { icon: <ShieldCheckIcon />, label: "Water" },
    { icon: <PawHeaderIcon />, label: "Playtime" },
    { icon: <ShieldCheckIcon />, label: "Comfort bed" },
    { icon: <ClipboardIcon />, label: "Daily cleaning" },
  ];

  return (
    <section className="relative overflow-hidden bg-brand-tint py-8 md:py-9 lg:py-10">
      <div className="pointer-events-none absolute left-8 top-20 text-brand-pink-light/30"><PawHeaderIcon /></div>
      <div className="pointer-events-none absolute right-8 top-8 rotate-12 text-brand-pink-light/30"><PawHeaderIcon /></div>
      <div className="site-container relative z-10">
        <header className="text-center">
          <h2 className="text-3xl font-extrabold uppercase tracking-tight text-brand-pink-dark md:text-4xl lg:text-[2.7rem]">Boarding Kennels</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-zinc-700 md:text-base lg:text-lg">
            A safe, clean, and comfy home away from home for your furry friend.
          </p>
        </header>
        {!catalog.loaded ? (
          <p role="status" className="mx-auto mt-7 max-w-xl rounded-xl bg-white p-4 text-center text-sm text-zinc-700">
            Boarding prices are temporarily unavailable. Please contact HappyTails for current rates.
          </p>
        ) : small.length === 0 && big.length === 0 ? (
          <p className="mt-7 text-center text-sm text-zinc-600">Boarding packages are currently being updated.</p>
        ) : (
          <div className="mx-auto mt-7 grid max-w-6xl grid-cols-1 items-stretch gap-5 md:mt-8 md:grid-cols-2 md:gap-6">
            {small.length > 0 && <PricingCard
              headerIcon={<PawHeaderIcon />}
              label="SMALL KENNELS"
              tagline="A comfortable stay for small and medium pets."
              imageSrc={smallKennelImage || "/images/small-kennel-dog.png"}
              imageAlt="Dog relaxing in a small boarding kennel"
              includes={includes}
              tiers={smallRates.length
                ? smallRates
                : [{ label: "Rate details are being updated", price: "—" }]}
            />}
            {big.length > 0 && <PricingCard
              headerIcon={<PawHeaderIcon />}
              label="BIG KENNELS"
              tagline="Spacious accommodation for eligible pets and shared bookings."
              imageSrc={bigKennelImage || "/images/big-kennel-dog.png"}
              imageAlt="Dog resting in a big boarding kennel"
              includes={includes}
              tiers={bigRates.length
                ? bigRates
                : [{ label: "Rate details are being updated", price: "—" }]}
            />}
          </div>
        )}
        <div className="mx-auto mt-6 max-w-5xl">
          <PoliciesInlineCard items={[
            { icon: <ClipboardIcon />, text: "Proof of vaccination required." },
            { icon: <ClockIcon />, text: "Drop-off and pick-up according to your confirmed boarding schedule." },
            { icon: <BackpackIcon />, text: "Bring your pet's food, bed, and essentials." },
          ]} />
        </div>
      </div>
    </section>
  );
}
