import type { Product } from "@/lib/data/products";

export default function ProductManageCard({
  product,
  onEdit,
  onArchiveToggle,
}: {
  product: Product;
  onEdit: () => void;
  onArchiveToggle: () => void;
}) {
  return (
    <div className={`bg-white rounded-xl border-2 p-3 flex flex-col items-center text-center ${product.archived ? "border-zinc-200 opacity-60" : "border-pink-100"}`}>
      <div className="w-full aspect-square bg-brand-tint rounded-lg flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <svg viewBox="0 0 64 64" className="w-10 h-10 text-pink-200">
            <path fill="currentColor" d="M20 20c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zm24 0c3 0 5-3 5-6s-2-6-5-6-5 3-5 6 2 6 5 6zM12 30c2.5 0 4.5-2.7 4.5-6S14.5 18 12 18s-4.5 2.7-4.5 6S9.5 30 12 30zm40 0c2.5 0 4.5-2.7 4.5-6S54.5 18 52 18s-4.5 2.7-4.5 6S49.5 30 52 30zM32 26c-7 0-16 4-16 12v3c0 3 2.5 5.5 5.5 5.5h21c3 0 5.5-2.5 5.5-5.5v-3c0-8-9-12-16-12z" />
          </svg>
        )}
      </div>
      <p className="mt-2 text-xs font-semibold text-zinc-800 uppercase truncate w-full">{product.name}</p>
      <p className="text-xs text-zinc-500">{product.weight}</p>
      <p className="text-sm font-bold text-brand-pink">₱{product.price}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onArchiveToggle}
          aria-label={product.archived ? "Unarchive" : "Archive"}
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
      {product.archived && <p className="mt-1 text-[10px] font-semibold text-zinc-400">ARCHIVED</p>}
    </div>
  );
}
