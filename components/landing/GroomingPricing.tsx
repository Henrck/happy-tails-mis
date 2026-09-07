// Grooming pricing: Basic / Diamond / Premium, three columns on desktop,
// stacked on mobile. REAL FIX: Basic Grooming was completely missing
// from the code before this — only Diamond and Premium existed, even
// though it's a real package with its own real prices in the reference
// design. Uses the shared PricingCard (new diagonal-photo-header design)
// and the new inline PoliciesInlineCard instead of the old button+modal.
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

export default function GroomingPricing() {
  return (
    <section className="bg-brand-tint py-14">
      <div className="site-container">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 text-center">
          Grooming Services
        </h2>
        <p className="mt-2 text-zinc-500 text-center text-sm md:text-base">
          Care tailored to your pet&apos;s needs. Clean, happy, and ready to shine!
        </p>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-stretch">
          <PricingCard
            headerIcon={<PawHeaderIcon />}
            label="BASIC GROOMING"
            description="Essential care to keep your pet clean and fresh."
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
            description="Bath & dry, hair cut, conditioner, ear clean, nail trim, teeth brushing, anal sac + pupucino."
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
            description="Specialty cut, Asian fusion, puppy cut, teddy style, bath & dry, hair cut, conditioner, ear clean, nail trim, teeth brushing, anal sac + pupucino."
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

        <div className="mt-8">
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
