// Grooming pricing: Diamond (left) and Premium (right) side by side on
// desktop, stacked on mobile. Uses the shared PricingCard for the ribbon
// header + portrait photo badge + zebra-striped price table styling.
// Note: per design notes, prices/photos here are meant to be editable
// later via the admin/MIS module.
import PricingCard from "./PricingCard";
import PoliciesButton from "./PoliciesButton";

const diamondTiers = [
  { label: "SMALL (Below 5 kilograms)", price: "₱750" },
  { label: "MEDIUM (5 to 12 kilograms)", price: "₱850" },
  { label: "LARGE (12 to 17 kilograms)", price: "₱1100" },
  { label: "EXTRA LARGE (17 to 29 kilograms)", price: "₱1350" },
  { label: "2 EXTRA LARGE (Above 29 kilograms)", price: "₱1500" },
];

const premiumTiers = [
  { label: "SMALL (Below 5 kilograms)", price: "₱650" },
  { label: "MEDIUM (5 to 12 kilograms)", price: "₱770" },
  { label: "LARGE (12 to 17 kilograms)", price: "₱1000" },
  { label: "EXTRA LARGE (17 to 29 kilograms)", price: "₱1250" },
  { label: "2 EXTRA LARGE (Above 29 kilograms)", price: "₱1400" },
];

export default function GroomingPricing() {
  return (
    <section className="bg-brand-tint py-14">
      <div className="site-container grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <PricingCard
          label="DIAMOND"
          subLines={[
            "(ALL COAT)(ALL STYLES APPLIES)",
            "(BATH & DRY, HAIR CUT, CONDITIONER, EAR CLEAN, NAIL TRIM, TEETH BRUSHING, ANAL SAC + PUPUCINO)",
          ]}
          imageSrc="/images/pomeranian.png"
          imageAlt="Freshly groomed Pomeranian"
          tiers={diamondTiers}
        />
        <PricingCard
          label="PREMIUM"
          subLines={[
            "(DOUBLE COATED, LONG/ CURLY HAIRED)",
            "(SPECIALTY CUT, ASIAN FUSION, PUPPY CUT, TEDDY STYLE)",
            "(BATH & DRY, HAIR CUT, CONDITIONER, EAR CLEAN, NAIL TRIM, TEETH BRUSHING, ANAL SAC + PUPUCINO)",
          ]}
          imageSrc="/images/poodle.png"
          imageAlt="Freshly groomed toy poodle"
          tiers={premiumTiers}
        />
      </div>
      <div className="mt-8 flex justify-center">
        <PoliciesButton variant="solid" />
      </div>
    </section>
  );
}
