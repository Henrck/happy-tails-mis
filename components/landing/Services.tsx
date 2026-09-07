// Pet Services section — three photo-topped cards (Grooming / Boarding /
// Spa) shown directly below the hero carousel. Redesigned to match the
// reference design (Pet_services.png): real photo up top with a rounded
// icon badge overlapping the seam, title + divider, description, and a
// row of 4 feature icons at the bottom. Photos are admin-editable via
// site_settings (same pattern as the banner sections below), falling
// back to bundled defaults if nothing's been uploaded yet.
import Image from "next/image";

type FeatureIcon = { label: string; icon: React.ReactNode };

function BathIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2z" />
      <path d="M4 12V7a2 2 0 0 1 2-2 2 2 0 0 1 2 2" />
      <circle cx="9" cy="4" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="3" r="0.6" fill="currentColor" stroke="none" />
      <path d="M6 21v1M14 21v1" />
    </svg>
  );
}
function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="6" cy="18" r="2.2" />
      <path d="M7.8 7.5 20 19M20 5 7.8 16.5" />
    </svg>
  );
}
function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2h4v3.2l1.6 2.4V21a1 1 0 0 1-1 1H9.4a1 1 0 0 1-1-1V7.6L10 5.2V2z" />
      <path d="M9.5 12h5" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5C19 15.6 12 20 12 20z" />
    </svg>
  );
}
function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
      <path d="M3 18v2M21 18v2M3 12V9a2 2 0 0 1 2-2h5v3" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 4.5a3 3 0 0 1 0 5.8M18.5 21v-1a5.5 5.5 0 0 0-3.5-5.1" />
    </svg>
  );
}
function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18M6 6c2.5 2 4 4 4 6s-1.5 4-4 6M18 6c-2.5 2-4 4-4 6s1.5 4 4 6" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c8 0 14-6 16-16C10 5.5 4 11 4 20z" />
      <path d="M6 18C10 13 14 9.5 18.5 5" />
    </svg>
  );
}
function MassageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 13c0-4 2.5-7 6-7s6 3 6 7" />
      <path d="M4 13h4l1 4H5zM16 13h4l-1 4h-4z" />
      <path d="M9 21h6" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  );
}
function LotusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4-2-7-5-7-9 3 0 5.5 1.5 7 4 1.5-2.5 4-4 7-4 0 4-3 7-7 9z" />
      <path d="M12 12V3" />
    </svg>
  );
}

function BadgeBathIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13h16v1.5A5.5 5.5 0 0 1 14.5 20h-5A5.5 5.5 0 0 1 4 14.5V13z" />
      <path d="M4 13V8a2 2 0 0 1 3.5-1.3" />
      <circle cx="9" cy="5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BadgeHouseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 10v8.5a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1V10" />
      <path d="M10.5 9.3c0-1 .8-1.6 1.5-1.6s1.5.6 1.5 1.6c0 1-1.5 2-1.5 2s-1.5-1-1.5-2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function BadgeSpaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c-4-2-7-5-7-9 3 0 5.5 1.5 7 4 1.5-2.5 4-4 7-4 0 4-3 7-7 9z" />
      <path d="M12 12V4" />
    </svg>
  );
}

const services: {
  key: string;
  title: string;
  description: string;
  badgeIcon: React.ReactNode;
  imageAlt: string;
  defaultImage: string;
  features: FeatureIcon[];
}[] = [
  {
    key: "grooming",
    title: "Pet Grooming",
    description:
      "Where care meets comfort. Give your pet a soothing grooming experience with our trained professionals — from refreshing baths to tidy trims and stylish finishes.",
    badgeIcon: <BadgeBathIcon />,
    imageAlt: "Groomer trimming a small dog's fur",
    defaultImage: "/images/grooming-banner-bg.png",
    features: [
      { label: "Gentle Baths", icon: <BathIcon /> },
      { label: "Tidy Trims & Styling", icon: <ScissorsIcon /> },
      { label: "Quality Products", icon: <BottleIcon /> },
      { label: "Stress-free Experience", icon: <HeartIcon /> },
    ],
  },
  {
    key: "boarding",
    title: "Pet Boarding",
    description:
      "A safe stay they'll enjoy. Our welcoming boarding spaces are designed for relaxation and play, giving your pet plenty of room to move and rest comfortably.",
    badgeIcon: <BadgeHouseIcon />,
    imageAlt: "Three dogs waiting at the boarding facility door",
    defaultImage: "/images/boarding-banner-bg.png",
    features: [
      { label: "Cozy & Clean Spaces", icon: <BedIcon /> },
      { label: "Attentive Staff", icon: <PeopleIcon /> },
      { label: "Daily Play & Care", icon: <BallIcon /> },
      { label: "Safe & Secure Environment", icon: <ShieldIcon /> },
    ],
  },
  {
    key: "spa",
    title: "Pet Spa",
    description:
      "Pet Spa Ayurveda is a holistic pet grooming and wellness service inspired by Ayurvedic principles, using natural herbal products and gentle, chemical-free treatments.",
    badgeIcon: <BadgeSpaIcon />,
    imageAlt: "Dog receiving an herbal spa treatment",
    defaultImage: "/images/spa-banner-bg.png",
    features: [
      { label: "Herbal & Natural Products", icon: <LeafIcon /> },
      { label: "Gentle Massages", icon: <MassageIcon /> },
      { label: "Chemical-free Treatments", icon: <SparkleIcon /> },
      { label: "Relaxation & Well-being", icon: <LotusIcon /> },
    ],
  },
];

export default function Services({
  groomingImage,
  boardingImage,
  spaImage,
}: {
  groomingImage?: string | null;
  boardingImage?: string | null;
  spaImage?: string | null;
}) {
  const images: Record<string, string | null | undefined> = {
    grooming: groomingImage,
    boarding: boardingImage,
    spa: spaImage,
  };

  return (
    <section id="services" className="bg-brand-tint py-14">
      <div className="site-container">
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 text-center">
          Our Pet Services
        </h2>
        <p className="mt-2 text-zinc-500 text-center text-sm md:text-base">
          Everything your pet needs for a happy, healthy life.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {services.map((service) => {
            const src = images[service.key] || service.defaultImage;
            const isRemote = !!images[service.key];
            return (
              <div
                key={service.key}
                className="rounded-3xl bg-white shadow-lg overflow-hidden flex flex-col"
              >
                <div className="relative w-full aspect-[16/11]">
                  <Image
                    src={src}
                    alt={service.imageAlt}
                    fill
                    className="object-cover"
                    unoptimized={isRemote}
                  />
                </div>

                <div className="relative flex-1 flex flex-col items-center text-center px-6 pb-7">
                  <div className="absolute -top-8 left-6 w-16 h-16 rounded-full bg-white shadow-md border-4 border-white ring-1 ring-pink-100 flex items-center justify-center text-brand-pink">
                    {service.badgeIcon}
                  </div>

                  <h3 className="mt-6 text-xl md:text-2xl font-bold text-brand-pink">
                    {service.title}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-2 text-brand-pink-light">
                    <span className="h-px w-8 bg-brand-pink-light" />
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                      <path d="M12 15c-3 0-8 1.7-8 5v1c0 .6.4 1 1 1h14c.6 0 1-.4 1-1v-1c0-3.3-5-5-8-5z" />
                      <circle cx="6" cy="7" r="2" />
                      <circle cx="10" cy="4.5" r="1.6" />
                      <circle cx="14" cy="4.5" r="1.6" />
                      <circle cx="18" cy="7" r="2" />
                    </svg>
                    <span className="h-px w-8 bg-brand-pink-light" />
                  </div>

                  <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
                    {service.description}
                  </p>

                  <div className="mt-6 grid grid-cols-4 gap-2 w-full">
                    {service.features.map((feature) => (
                      <div key={feature.label} className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink">
                          {feature.icon}
                        </div>
                        <span className="text-[10px] md:text-[11px] leading-tight text-zinc-500">
                          {feature.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
