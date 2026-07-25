// Shared product card, used by both the homepage carousel and the /products
// page grid. Shows a placeholder image until real product photos exist.
import Image from "next/image";
import type { Product } from "@/lib/data/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm">
      <div className="relative w-full aspect-square bg-pink-50 flex items-center justify-center">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        ) : (
          <svg viewBox="0 0 64 64" className="w-12 h-12 text-pink-200">
            <path
              fill="currentColor"
              d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2.7-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2.7-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z"
            />
          </svg>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-semibold text-zinc-800 uppercase truncate">
          {product.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-zinc-500">{product.weight}</span>
          <span className="text-sm font-bold text-brand-pink">
            ₱{product.price}
          </span>
        </div>
      </div>
    </div>
  );
}
