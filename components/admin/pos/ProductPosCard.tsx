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
  return (
    <div className="bg-white rounded-xl border-2 border-pink-100 p-3 flex flex-col items-center text-center">
      <ProductImage src={product.image_url} alt={product.name} />
      <p className="mt-2 text-xs font-semibold text-zinc-800 uppercase truncate w-full">{product.name}</p>
      <p className="text-xs text-zinc-500">{product.package_size ?? product.unit}</p>
      <p className="text-sm font-bold text-brand-pink">₱{product.price}</p>

      <div className="mt-2 flex items-center gap-3">
        <button onClick={onDecrement} disabled={qty === 0} aria-label={`Remove one ${product.name}`} className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center disabled:opacity-30 hover:bg-brand-pink-dark transition-colors">−</button>
        {qty > 0 && <span className="text-sm font-semibold text-zinc-700 w-4 text-center">{qty}</span>}
        <button onClick={onIncrement} aria-label={`Add one ${product.name}`} className="w-7 h-7 rounded-full bg-brand-pink text-white flex items-center justify-center hover:bg-brand-pink-dark transition-colors">+</button>
      </div>
    </div>
  );
}
