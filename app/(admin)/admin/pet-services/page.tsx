// Pet Services landing — choose Grooming or Boarding management.
// Matches Josh's reference: centered logo up top, two large circular pink
// buttons with a white line-art icon and label.
import Image from "next/image";
import Link from "next/link";

const choices = [
  {
    href: "/admin/pet-services/grooming",
    label: "Pet Grooming",
    icon: (
      <svg viewBox="0 0 100 100" className="w-24 h-24 md:w-28 md:h-28" fill="none" stroke="white" strokeWidth="2.5">
        {/* dog head under running water */}
        <path d="M35 40c0-9 7-16 16-16s16 7 16 16" strokeLinecap="round" />
        <path d="M28 40h46l-4 20c-1 6-6 10-12 10H44c-6 0-11-4-12-10z" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="50" r="2" fill="white" stroke="none" />
        <circle cx="58" cy="50" r="2" fill="white" stroke="none" />
        <path d="M45 58q6 4 10 0" strokeLinecap="round" />
        {/* shower */}
        <path d="M50 14v8" strokeLinecap="round" />
        <circle cx="30" cy="22" r="2" fill="white" stroke="none" />
        <circle cx="38" cy="18" r="2" fill="white" stroke="none" />
        <circle cx="62" cy="18" r="2" fill="white" stroke="none" />
        <circle cx="70" cy="22" r="2" fill="white" stroke="none" />
        {/* suds at base */}
        <circle cx="30" cy="76" r="5" />
        <circle cx="40" cy="80" r="4" />
        <circle cx="60" cy="80" r="4" />
        <circle cx="70" cy="76" r="5" />
      </svg>
    ),
  },
  {
    href: "/admin/pet-services/boarding",
    label: "Pet Boarding",
    icon: (
      <svg viewBox="0 0 100 100" className="w-24 h-24 md:w-28 md:h-28" fill="none" stroke="white" strokeWidth="2.5">
        {/* house */}
        <path d="M15 45L50 18l35 27" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 42v34a2 2 0 0 0 2 2h52a2 2 0 0 0 2-2V42" strokeLinecap="round" strokeLinejoin="round" />
        {/* door with paw print */}
        <rect x="40" y="55" width="20" height="23" rx="2" />
        <circle cx="47" cy="63" r="1.6" fill="white" stroke="none" />
        <circle cx="53" cy="63" r="1.6" fill="white" stroke="none" />
        <circle cx="44" cy="67" r="1.6" fill="white" stroke="none" />
        <circle cx="56" cy="67" r="1.6" fill="white" stroke="none" />
        <path d="M44 73q6 4 12 0" strokeLinecap="round" />
        {/* food/water bowls */}
        <ellipse cx="70" cy="80" rx="7" ry="3" />
        <ellipse cx="82" cy="80" rx="7" ry="3" />
      </svg>
    ),
  },
];

export default function PetServicesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-brand-pink">Pet Services</h1>
      <div className="mt-1 border-b-2 border-brand-pink/40" />

      <div className="mt-10 flex flex-col items-center">
        <Image
          src="/images/footer-logo.png"
          alt="Happy Tails Pet Grooming Cafe"
          width={220}
          height={220}
          className="w-40 md:w-52 h-auto"
        />

        <div className="mt-10 flex flex-col sm:flex-row gap-10 md:gap-16">
          {choices.map((choice) => (
            <Link
              key={choice.href}
              href={choice.href}
              className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-brand-pink hover:bg-brand-pink-dark shadow-lg flex flex-col items-center justify-center gap-3 transition-colors"
            >
              {choice.icon}
              <span className="text-white text-xl md:text-2xl font-bold">{choice.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
