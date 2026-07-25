import type { Product } from "@/lib/data/products";

export default function ProductPosCard({
  product,
  qty,
  onIncrement,
  onDecrement,
}: {
  product: Product;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border-2 border-pink-100 p-3 flex flex-col items-center text-center">
      <div className="w-full aspect-square bg-brand-tint rounded-lg flex items-center justify-center">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
        ) : (
          <svg viewBox="0 0 64 64" className="w-10 h-10 text-pink-200">
            <path
              fill="currentColor"
              d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2.7-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2.7-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z"
            />
          </svg>
        )}
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-800 uppercase truncate w-full">{product.name}</p>
      <p className="text-xs text-zinc-500">{product.weight}</p>
      <p className="text-sm font-bold text-brand-pink">₱{product.price}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onDecrement}
          disabled={qty === 0}
          aria-label={`Remove one ${product.name}`}
          className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center disabled:opacity-30 hover:bg-brand-pink-dark transition-colors"
        >
          −
        </button>
        {qty > 0 && <span className="text-sm font-semibold text-zinc-700 w-4 text-center">{qty}</span>}
        <button
          onClick={onIncrement}
          aria-label={`Add one ${product.name}`}
          className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center hover:bg-brand-pink-dark transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
