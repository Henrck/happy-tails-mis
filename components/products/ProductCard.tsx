import Image from "next/image";
import type { Product } from "@/lib/types/products";

export default function ProductCard({ product, onView }: { product: Product; onView?: () => void }) {
  const size = product.package_size ?? product.unit;
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-[0_4px_16px_-2px_rgba(236,56,152,0.06),0_2px_6px_-1px_rgba(17,24,39,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_28px_-6px_rgba(236,56,152,0.14),0_4px_12px_-2px_rgba(17,24,39,0.06)]">
      <button type="button" onClick={onView} className="flex h-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-pink" aria-label={`View details for ${product.name}`}>
        <div className="relative m-3 mb-0 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#F9FAFB] p-5">
          <span className="absolute left-2.5 top-2.5 z-[1] max-w-[65%] truncate rounded-full border border-pink-100 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-brand-pink">{product.category}</span>
          {product.image_url ? (
            <div className="relative h-full w-full transition-transform duration-300 group-hover:scale-105"><Image src={product.image_url} alt={product.name} fill className="object-contain" sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px" unoptimized /></div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl text-pink-200" aria-hidden="true">🐾</div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 pt-3.5 sm:p-4">
          <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-zinc-900 transition-colors group-hover:text-brand-pink sm:text-[15px]" title={product.name}>{product.name}</h2>
          <div className="mt-2 flex items-end justify-between gap-2">
            <span className="min-w-0 truncate rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-500 sm:text-xs" title={size}>{size}</span>
            <span className="shrink-0 text-sm font-extrabold text-brand-pink sm:text-base">₱{Number(product.price).toLocaleString("en-PH", { maximumFractionDigits: 2 })}</span>
          </div>
          <span className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-tint px-3 py-2.5 text-xs font-bold text-brand-pink transition-colors group-hover:bg-brand-pink group-hover:text-white sm:text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            View Details
          </span>
        </div>
      </button>
    </article>
  );
}
