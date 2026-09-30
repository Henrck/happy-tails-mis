// Shared banner used by Grooming/Boarding/Spa.
// Responsive sizing keeps the image and text contained at every breakpoint.
import Image from "next/image";

export default function PhotoBanner({
  src,
  alt,
  width,
  height,
  heading,
  children,
  isRemote,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  heading: string;
  children: React.ReactNode;
  isRemote?: boolean;
}) {
  return (
    <section className="relative min-h-[420px] w-full overflow-hidden bg-brand-tint sm:min-h-[480px] lg:min-h-[560px]">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-center"
        sizes="100vw"
        unoptimized={isRemote}
        priority
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative z-10 flex min-h-[420px] items-center justify-center px-5 py-16 text-center sm:min-h-[480px] sm:px-8 sm:py-20 lg:min-h-[560px] lg:px-16 lg:py-24">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl md:text-5xl lg:text-6xl">
            {heading}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white drop-shadow-sm sm:text-base md:text-xl lg:text-2xl">
            {children}
          </p>
        </div>
      </div>
    </section>
  );
}
