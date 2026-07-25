// Services section — three cards (Grooming / Boarding / Spa) shown directly
// below the hero photo. Text matches the design exactly.
// Note: per design notes, card text/images are meant to be editable later
// via the admin/MIS module.

const services = [
  {
    title: "Pet Grooming",
    description:
      "Where care meets comfort. Give your pet a soothing grooming experience with our trained professionals — from refreshing baths to tidy trims and stylish finishes. We focus on gentle handling, quality products, and making every visit stress-free, so your pet leaves clean, calm, and confident.",
    icon: (
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* shower head + water drops */}
        <circle cx="72" cy="18" r="7" fill="none" stroke="#000" strokeWidth="2.5" />
        <path d="M72 25v14" stroke="#000" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="66" cy="42" r="1.6" fill="#7DD3FC" />
        <circle cx="72" cy="45" r="1.6" fill="#7DD3FC" />
        <circle cx="78" cy="42" r="1.6" fill="#7DD3FC" />
        {/* cat head */}
        <path d="M35 30l-6-10 10 4z" fill="#FBBF77" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
        <path d="M63 30l6-10-10 4z" fill="#FBBF77" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="49" cy="38" r="20" fill="#FBBF77" stroke="#000" strokeWidth="2.5" />
        <circle cx="42" cy="36" r="2" fill="#000" />
        <circle cx="56" cy="36" r="2" fill="#000" />
        <path d="M45 44q4 3 8 0" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* suds */}
        <circle cx="30" cy="50" r="4" fill="#fff" stroke="#000" strokeWidth="1.5" />
        <circle cx="68" cy="48" r="3" fill="#fff" stroke="#000" strokeWidth="1.5" />
        {/* tub */}
        <path d="M20 58h58l-6 16a6 6 0 0 1-6 4H32a6 6 0 0 1-6-4z" fill="#FDE4B8" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        {/* bottle */}
        <rect x="73" y="45" width="10" height="18" rx="2" fill="#F59E0B" stroke="#000" strokeWidth="2" />
        <rect x="76" y="41" width="4" height="5" fill="#78716C" />
      </svg>
    ),
  },
  {
    title: "Pet Boarding",
    description:
      "A safe stay they'll enjoy. Our welcoming boarding spaces are designed for relaxation and play, giving your pet plenty of room to move and rest comfortably. With attentive staff, daily care, and a warm environment, your pet will feel secure, happy, and right at home while you're away.",
    icon: (
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* roof */}
        <path d="M12 45L50 15l38 30" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 42L50 18l32 24v30a3 3 0 0 1-3 3H21a3 3 0 0 1-3-3z" fill="#FDE9C8" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        {/* heart */}
        <path d="M50 30c-2-3-7-3-8 1-1 4 3 6 8 10 5-4 9-6 8-10-1-4-6-4-8-1z" fill="#F87171" />
        {/* two dog windows */}
        <circle cx="37" cy="62" r="13" fill="#fff" stroke="#000" strokeWidth="2.5" />
        <circle cx="63" cy="62" r="13" fill="#fff" stroke="#000" strokeWidth="2.5" />
        <path d="M31 56l-3-6 6 3z" fill="#D6B98C" stroke="#000" strokeWidth="1.5" />
        <path d="M43 56l3-6-6 3z" fill="#D6B98C" stroke="#000" strokeWidth="1.5" />
        <circle cx="37" cy="63" r="6" fill="#D6B98C" stroke="#000" strokeWidth="1.5" />
        <circle cx="34" cy="62" r="1.2" fill="#000" />
        <circle cx="40" cy="62" r="1.2" fill="#000" />
        <path d="M57 56l-3-6 6 3z" fill="#78716C" stroke="#000" strokeWidth="1.5" />
        <path d="M69 56l3-6-6 3z" fill="#78716C" stroke="#000" strokeWidth="1.5" />
        <circle cx="63" cy="63" r="6" fill="#78716C" stroke="#000" strokeWidth="1.5" />
        <circle cx="60" cy="62" r="1.2" fill="#fff" />
        <circle cx="66" cy="62" r="1.2" fill="#fff" />
      </svg>
    ),
  },
  {
    title: "Pet Spa",
    description:
      "Pet Spa Ayurveda is a holistic pet grooming and wellness service inspired by Ayurvedic principles. It uses natural herbal products, gentle massages, and chemical-free treatments to improve your pet's skin and coat health while promoting relaxation, comfort, and overall well-being.",
    icon: (
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {/* awning */}
        <path d="M15 40l10-16h50l10 16z" fill="#F59E0B" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M15 40h70v6H15z" fill="#FDE68A" stroke="#000" strokeWidth="2" />
        {/* SPA sign */}
        <rect x="34" y="10" width="32" height="14" rx="2" fill="#fff" stroke="#000" strokeWidth="2.5" />
        <text x="50" y="20" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#000">SPA</text>
        {/* storefront body */}
        <rect x="20" y="46" width="60" height="38" fill="#FDE9C8" stroke="#000" strokeWidth="2.5" />
        {/* curtain / plant */}
        <path d="M30 84V52c8 0 8 32 0 32z" fill="#86EFAC" stroke="#000" strokeWidth="2" />
        <path d="M70 84V52c-8 0-8 32 0 32z" fill="#86EFAC" stroke="#000" strokeWidth="2" />
        <path d="M40 52h20v32H40z" fill="#fff" stroke="#000" strokeWidth="2" />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="services" className="bg-brand-tint py-14">
      <div className="site-container grid grid-cols-1 md:grid-cols-3 gap-6">
        {services.map((service) => (
          <div
            key={service.title}
            className="rounded-3xl bg-gradient-to-b from-brand-pink to-brand-pink-light text-white text-center px-8 py-10 flex flex-col items-center shadow-lg"
          >
            {service.icon}
            <h3 className="mt-3 text-2xl font-bold">{service.title}</h3>
            <p className="mt-4 text-sm leading-relaxed">
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
