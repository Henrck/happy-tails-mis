import PricingCard from "./PricingCard";
import PoliciesInlineCard from "./PoliciesInlineCard";
import {
  PawHeaderIcon,
  ClipboardIcon,
  ClockIcon,
  BackpackIcon,
  BathDryIcon,
  ShieldCheckIcon,
} from "./pricing-icons";

const smallKennelTiers = [
  { label: "1 NIGHT", price: "₱530" },
  { label: "3 DAYS & 2 NIGHT", price: "₱1020" },
  { label: "4 DAYS & 3 NIGHT", price: "₱1500" },
  { label: "5 DAYS & 4 NIGHT", price: "₱1920" },
  { label: "6 DAYS & 5 NIGHT", price: "₱2350" },
  { label: "7 DAYS UP (PER NIGHT)", price: "₱440" },
];

const bigKennelTiers = [
  { label: "1 NIGHT", price: "₱650" },
  { label: "3 DAYS & 2 NIGHT", price: "₱1250" },
  { label: "4 DAYS & 3 NIGHT", price: "₱1845" },
  { label: "5 DAYS & 4 NIGHT", price: "₱2400" },
  { label: "6 DAYS & 5 NIGHT", price: "₱2900" },
  { label: "7 DAYS UP (PER NIGHT)", price: "₱550" },
];

export default function BoardingPricing({
  smallKennelImage,
  bigKennelImage,
}: {
  smallKennelImage?: string | null;
  bigKennelImage?: string | null;
}) {
  return (
    <section className="relative overflow-hidden bg-brand-tint py-8 md:py-9 lg:py-10">
      <div className="pointer-events-none absolute left-8 top-20 text-brand-pink-light/30">
        <PawHeaderIcon />
      </div>
      <div className="pointer-events-none absolute right-8 top-8 rotate-12 text-brand-pink-light/30">
        <PawHeaderIcon />
      </div>

      <div className="site-container relative z-10">
        <header className="text-center">
          <div className="flex items-center justify-center gap-3 text-brand-pink-dark">
            <span className="text-brand-pink-light" aria-hidden="true">✦</span>
            <h2 className="text-3xl font-extrabold uppercase tracking-tight leading-none md:text-4xl lg:text-[2.7rem]">
              Boarding Kennels
            </h2>
            <span className="text-brand-pink-light" aria-hidden="true">♡</span>
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-zinc-700 md:text-base lg:text-lg">
            A safe, clean, and comfy home away from home for your furry friend.
          </p>
        </header>

        <div className="mx-auto mt-7 grid max-w-6xl grid-cols-1 items-stretch gap-5 md:mt-8 md:grid-cols-2 md:gap-6">
          <PricingCard
            headerIcon={<PawHeaderIcon />}
            label="SMALL KENNELS"
            tagline="Perfect for small breeds who love a cozy space."
            imageSrc={smallKennelImage || "/images/small-kennel-dog.png"}
            imageAlt="Dog relaxing on a bed in a small kennel"
            includes={[
              { icon: <BathDryIcon />, label: "Feeding" },
              { icon: <ShieldCheckIcon />, label: "Water" },
              { icon: <PawHeaderIcon />, label: "Playtime" },
              { icon: <ShieldCheckIcon />, label: "Comfort bed" },
              { icon: <ClipboardIcon />, label: "Daily cleaning" },
            ]}
            tiers={smallKennelTiers}
          />

          <PricingCard
            headerIcon={<PawHeaderIcon />}
            label="BIG KENNELS"
            tagline="Spacious and comfortable for medium to large breeds."
            imageSrc={bigKennelImage || "/images/big-kennel-dog.png"}
            imageAlt="Dog resting in a big kennel"
            includes={[
              { icon: <BathDryIcon />, label: "Feeding" },
              { icon: <ShieldCheckIcon />, label: "Water" },
              { icon: <PawHeaderIcon />, label: "Playtime" },
              { icon: <ShieldCheckIcon />, label: "Comfort bed" },
              { icon: <ClipboardIcon />, label: "Daily cleaning" },
            ]}
            tiers={bigKennelTiers}
          />
        </div>

        <div className="mx-auto mt-6 max-w-5xl">
          <PoliciesInlineCard
            items={[
              { icon: <ClipboardIcon />, text: "Proof of vaccination required." },
              { icon: <ClockIcon />, text: "Drop-off and pick-up during operating hours." },
              { icon: <BackpackIcon />, text: "Bring your pet's food, bed, and essentials." },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
