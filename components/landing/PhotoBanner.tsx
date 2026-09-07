// Shared banner used by Grooming/Boarding/Spa.
// The desktop banner has a consistent viewport-oriented height; the image
// fills the frame while the text stays centered and readable.
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
    <section className="relative h-[calc(100dvh-4rem)] min-h-[420px] w-full overflow-hidden bg-brand-tint md:h-[calc(100dvh-4rem)]">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={isRemote}
        priority
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center md:px-16">
        <h2 className="text-3xl font-bold text-white drop-shadow-md md:text-5xl lg:text-6xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white drop-shadow-sm md:text-xl lg:text-2xl">
          {children}
        </p>
      </div>
    </section>
  );
}
