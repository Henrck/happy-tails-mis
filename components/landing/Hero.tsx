// Hero section — top of the landing page.
// Photo with the logo and "Book Now" button overlaid. Background is now
// dynamic: falls back to the bundled default if site_settings has no
// override yet (e.g. before Website Management is ever used).
import Image from "next/image";

export default function Hero({ backgroundUrl }: { backgroundUrl?: string | null }) {
  return (
    <section className="relative">
      <div className="relative w-full aspect-[3/2] md:aspect-[16/7]">
        <Image
          src={backgroundUrl || "/images/hero-bg.png"}
          alt="Happy Tails Pet Grooming Cafe storefront"
          fill
          priority
          className="object-cover"
          unoptimized={!!backgroundUrl}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Image
            src="/images/logo.png"
            alt="Happy Tails Pet Grooming Cafe — Supplies, Boarding and Coffee"
            width={340}
            height={340}
            className="w-[60%] max-w-[340px] h-auto drop-shadow-lg"
          />
          <a
            href="/account/appointments/new"
            className="mt-3 md:mt-5 flex items-center gap-2 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm md:text-base"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.5 9.5c1.1 0 2-1.1 2-2.5S9.6 4.5 8.5 4.5 6.5 5.6 6.5 7s.9 2.5 2 2.5zm7 0c1.1 0 2-1.1 2-2.5s-.9-2.5-2-2.5-2 1.1-2 2.5.9 2.5 2 2.5zM4.5 14c1.1 0 2-1.1 2-2.5S5.6 9 4.5 9 2.5 10.1 2.5 11.5 3.4 14 4.5 14zm15 0c1.1 0 2-1.1 2-2.5S20.6 9 19.5 9s-2 1.1-2 2.5.9 2.5 2 2.5zM12 12c-2.5 0-7 1.5-7 4.5V18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-1.5c0-3-4.5-4.5-7-4.5z"/>
            </svg>
            Book Now
          </a>
        </div>
      </div>
    </section>
  );
}
