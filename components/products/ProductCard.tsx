import Image from "next/image";
import type { Product } from "@/lib/types/products";

export default function ProductCard({ product }: { product: Product }) {
  const size = product.package_size ?? product.unit;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full shrink-0 bg-pink-50">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-12 w-12 text-pink-200" aria-hidden="true">
              <path
                fill="currentColor"
                d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-3 py-3">
        <p
          className="line-clamp-2 min-h-[2rem] text-xs font-semibold uppercase leading-4 text-zinc-800"
          title={product.name}
        >
          {product.name}
        </p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="min-w-0 truncate text-xs text-zinc-500" title={size}>
            {size}
          </span>
          <span className="shrink-0 text-sm font-bold text-brand-pink">₱{product.price}</span>
        </div>
      </div>
    </div>
  );
}
