// Shared banner used by Grooming/Boarding/Spa sections: full, uncropped
// photo (no object-cover clipping) with a heading + subtext overlay.
// Uses the image's real intrinsic size instead of `fill`, so the whole
// photo is always visible. width/height can now come from a dynamically
// uploaded image (see Website Management) — real dimensions captured at
// upload time — not just the bundled defaults.
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
    <section className="relative w-full">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-auto"
        sizes="100vw"
        unoptimized={isRemote}
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 md:px-16">
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white drop-shadow-md">
          {heading}
        </h2>
        <p className="mt-5 max-w-3xl text-base md:text-2xl text-white leading-relaxed drop-shadow-sm">
          {children}
        </p>
      </div>
    </section>
  );
}
