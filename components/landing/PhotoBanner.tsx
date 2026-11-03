// Shared, consistently sized image banner for Grooming, Boarding, and Spa.
// Keep the existing props so all service sections and admin previews continue to work.
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
  // The image is intentionally full-bleed. Source dimensions remain part of
  // the component API for callers that supply images through Website Management.
  void width;
  void height;

  return (
    <section className="relative w-full min-h-[360px] overflow-hidden bg-zinc-900 sm:min-h-[420px] lg:min-h-[480px]">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-center"
        sizes="100vw"
        unoptimized={isRemote}
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[360px] items-center justify-center px-5 py-14 text-center sm:min-h-[420px] sm:px-8 sm:py-16 lg:min-h-[480px] lg:px-12 lg:py-20">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="text-3xl font-bold leading-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
            {heading}
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-white drop-shadow-sm sm:text-base sm:leading-8 lg:text-lg">
            {children}
          </p>
        </div>
      </div>
    </section>
  );
}
