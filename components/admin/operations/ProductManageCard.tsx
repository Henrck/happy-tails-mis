import type { Product } from "@/lib/types/products";
import ProductImage from "@/components/admin/pos/ProductImage";

export default function ProductManageCard({
  product,
  onEdit,
  onArchiveToggle,
}: {
  product: Product;
  onEdit: () => void;
  onArchiveToggle: () => void;
}) {
  const archived = product.status === "discontinued";
  return (
    <div className={`bg-white rounded-xl border-2 p-3 flex flex-col items-center text-center ${archived ? "border-zinc-200 opacity-60" : "border-pink-100"}`}>
      <ProductImage src={product.image_url} alt={product.name} />
      <p className="mt-2 text-xs font-semibold text-zinc-800 uppercase truncate w-full">{product.name}</p>
      <p className="text-xs text-zinc-500">{product.package_size ?? product.unit}</p>
      <p className="text-sm font-bold text-brand-pink">₱{product.price}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onArchiveToggle}
          aria-label={archived ? "Unarchive" : "Archive"}
          className="w-7 h-7 rounded-full border-2 border-red-400 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={onEdit}
          aria-label="Edit"
          className="w-7 h-7 rounded-full border-2 border-brand-pink text-brand-pink flex items-center justify-center hover:bg-brand-pink hover:text-white transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {archived && <p className="mt-1 text-[10px] font-semibold text-zinc-400">ARCHIVED</p>}
    </div>
  );
}
