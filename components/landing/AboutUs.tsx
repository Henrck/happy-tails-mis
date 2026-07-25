// About Us section. Background photo + overlay text. Falls back to the
// bundled default if no override exists in site_settings yet.
import Image from "next/image";

export default function AboutUs({ backgroundUrl }: { backgroundUrl?: string | null }) {
  return (
    <section id="about" className="relative">
      <div className="relative w-full aspect-[3/2] md:aspect-[16/8]">
        <Image
          src={backgroundUrl || "/images/about-bg.png"}
          alt="A girl hugging her freshly groomed dog"
          fill
          className="object-cover"
          unoptimized={!!backgroundUrl}
        />
        <div className="absolute inset-0 bg-black/50" />

        <p
          className="absolute top-4 right-4 md:top-8 md:right-10 text-white/25 text-2xl md:text-4xl italic font-serif text-right leading-tight pointer-events-none select-none"
          style={{ fontFamily: "'Brush Script MT', cursive" }}
        >
          Happy Tails Pet
          <br />
          Grooming Cafe
        </p>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-16">
          <h2 className="flex items-center gap-2 text-2xl md:text-4xl font-bold text-white">
            <span aria-hidden>✨</span> About Us
          </h2>
          <p className="mt-4 max-w-2xl text-sm md:text-base font-medium text-white leading-relaxed">
            Happy Tails Pet Grooming Cafe is dedicated to providing a safe,
            caring, and enjoyable environment for pets and their owners. We
            offer professional pet grooming, comfortable boarding services,
            and quality pet supplies to ensure every pet receives the best
            care possible. Our goal is to create a place where pets feel
            loved and owners can trust that their companions are happy,
            clean, and well taken care of.
          </p>
        </div>

        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-4 md:px-10 text-white text-xs md:text-sm">
          <span className="flex items-center gap-1.5 opacity-90">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
            happytails.pgc
          </span>
          <span className="opacity-90">Supplies | Boarding | Coffee</span>
        </div>
      </div>
    </section>
  );
}
