// Boarding pricing: Small Kennels (left) and Big Kennels (right) side by
// side on desktop, stacked on mobile — same PricingCard treatment as
// Grooming for visual consistency across the two pricing sections.
// Note: per design notes, prices/photos here are meant to be editable
// later via the admin/MIS module.
import PricingCard from "./PricingCard";
import PoliciesButton from "./PoliciesButton";

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

export default function BoardingPricing() {
  return (
    <section className="bg-brand-tint py-14">
      <div className="site-container grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <PricingCard
          label="SMALL KENNELS"
          subLines={[]}
          imageSrc="/images/small-kennel-dog.png"
          imageAlt="Dog relaxing on a bed in a small kennel"
          tiers={smallKennelTiers}
        />
        <PricingCard
          label="BIG KENNELS"
          subLines={[]}
          imageSrc="/images/big-kennel-dog.png"
          imageAlt="Pomeranian in a big kennel"
          tiers={bigKennelTiers}
        />
      </div>
      <div className="mt-8 flex justify-center">
        <PoliciesButton variant="solid" />
      </div>
    </section>
  );
}
