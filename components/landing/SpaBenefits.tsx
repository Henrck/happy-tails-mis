// "Pet SPA Ayuverda benefits" — 6 cards inside one large pink gradient panel.
// Text matches the design exactly (including its repeated description text
// on 4 of the 6 cards — that repetition is in the source design, not a typo
// on our end).
// Note: per design notes, card text is meant to be editable later via the
// admin/MIS module.

const benefits = [
  {
    title: "Natural Healing",
    description:
      "Herbal blends that support your pet's body to heal naturally and gently.",
  },
  {
    title: "Stress Relief",
    description:
      "Calming Ayurvedic massage techniques that reduce anxiety and tension.",
  },
  {
    title: "Skin Nourishment",
    description:
      "Herbal blends that support your pet's body to heal naturally and gently.",
  },
  {
    title: "Pain Management",
    description:
      "Herbal blends that support your pet's body to heal naturally and gently.",
  },
  {
    title: "Improved Immunity",
    description:
      "Herbal blends that support your pet's body to heal naturally and gently.",
  },
  {
    title: "Herbal Therapy",
    description:
      "Herbal blends that support your pet's body to heal naturally and gently.",
  },
];

export default function SpaBenefits() {
  return (
    <section className="bg-brand-tint py-14">
      <div className="site-container bg-gradient-to-br from-brand-pink to-brand-pink-light rounded-3xl px-6 md:px-10 py-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
          Pet SPA Ayuverda benefits
        </h2>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-white border-2 border-cyan-300 rounded-xl px-5 py-4"
            >
              <h3 className="font-bold text-zinc-900">{benefit.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
