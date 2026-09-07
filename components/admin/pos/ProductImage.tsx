// One shared image container for product photos, used everywhere a
// product image appears (POS sales cards, POS configuration cards, the
// add/edit form preview). Every container is the exact same size no
// matter what — object-contain means each photo fits fully inside it
// instead of getting cropped to fill a square, so a tall bottle and a
// wide bag of kibble both just look like themselves at a consistent
// size, not stretched or chopped to match the container.
export default function ProductImage({
  src,
  alt,
  className = "",
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`w-full aspect-square bg-brand-tint rounded-lg flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-contain p-2" />
      ) : (
        <svg viewBox="0 0 64 64" className="w-10 h-10 text-pink-200">
          <path fill="currentColor" d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2.7-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2.7-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z" />
        </svg>
      )}
    </div>
  );
}
