import Image from "next/image";

// Match the service banners' height, heading scale, and text spacing.
// Preserve the About Us anchor, dynamic image, heading, and description.
export default function DynamicAbout({
  backgroundUrl,
  heading,
  description,
}: {
  backgroundUrl?: string | null;
  heading: string;
  description: string;
}) {
  return (
    <section id="about" className="relative w-full min-h-[360px] overflow-hidden bg-zinc-900 sm:min-h-[420px] lg:min-h-[480px]">
      <Image
        src={backgroundUrl || "/images/about-bg.png"}
        alt="Happy Tails pets"
        fill
        unoptimized={!!backgroundUrl}
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="site-container relative z-10 flex min-h-[360px] flex-col items-center justify-center px-5 py-14 text-center sm:min-h-[420px] sm:px-8 sm:py-16 lg:min-h-[480px] lg:px-12 lg:py-20">
        <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
          {heading}
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-white drop-shadow-sm sm:text-base sm:leading-8 lg:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
