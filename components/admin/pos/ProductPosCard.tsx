import type { Product } from "@/lib/types/products";
import ProductImage from "./ProductImage";

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
  const stock = Math.max(0, product.stock ?? 0);
  const outOfStock = stock <= 0;
  const maxReached = qty >= stock;

  return (
    <div
      className={`relative rounded-xl border-2 p-3 flex flex-col items-center text-center transition ${
        outOfStock
          ? "border-zinc-200 bg-zinc-50"
          : "border-pink-100 bg-white"
      }`}
    >
      {outOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/65">
          <span className="rounded-full bg-red-100 px-3 py-1.5 text-[11px] font-bold text-red-600 shadow-sm">
            OUT OF STOCK
          </span>
        </div>
      )}

      <div className={outOfStock ? "opacity-45 grayscale" : ""}>
        <ProductImage src={product.image_url} alt={product.name} />
      </div>

      <p
        className={`mt-2 text-xs font-semibold uppercase truncate w-full ${
          outOfStock ? "text-zinc-400" : "text-zinc-800"
        }`}
        title={product.name}
      >
        {product.name}
      </p>

      <p className="text-xs text-zinc-500">
        {product.package_size ?? product.unit}
      </p>

      <p className={`text-sm font-bold ${outOfStock ? "text-zinc-400" : "text-brand-pink"}`}>
        ₱{product.price}
      </p>

      {outOfStock ? (
        <p className="mt-2 text-[10px] font-semibold text-red-500">
          Out of stock — unavailable for sale
        </p>
      ) : (
        <>
          <p className="mt-1 text-[10px] text-zinc-400">
            {stock} {stock === 1 ? "available" : "available"}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={onDecrement}
              disabled={qty === 0}
              aria-label={`Remove one ${product.name}`}
              className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center disabled:opacity-30 hover:bg-brand-pink-dark transition-colors"
            >
              −
            </button>

            {qty > 0 && (
              <span className="text-sm font-semibold text-zinc-700 w-4 text-center">
                {qty}
              </span>
            )}

            <button
              onClick={onIncrement}
              disabled={maxReached}
              aria-label={
                maxReached
                  ? `Maximum available quantity reached for ${product.name}`
                  : `Add one ${product.name}`
              }
              className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-pink-dark transition-colors"
            >
              +
            </button>
          </div>

          {maxReached && (
            <p className="mt-1 text-[10px] text-amber-600">
              Maximum available quantity selected
            </p>
          )}
        </>
      )}
    </div>
  );
}
