"use client";
import { productUnitLabel } from "@/lib/constants/product-units";
// Public product details (products page and homepage carousel): the description
// comes first; the old Unit / Category / Availability table is replaced by an
// "available in-store" note.
import { useEffect } from "react";
import Image from "next/image";
import { MapPin, X } from "lucide-react";
import type { Product } from "@/lib/types/products";
import { formatPeso } from "@/lib/utils/currency";

const PET_BADGE: Record<string, string> = {
  dog: "border-amber-200 bg-amber-50 text-amber-700",
  cat: "border-sky-200 bg-sky-50 text-sky-700",
};

export default function ProductDetailDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const petTypes = product.pet_types ?? [];
  const size = productUnitLabel(product);
  const description = product.description?.trim();

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-zinc-950/50 p-3 backdrop-blur-sm sm:p-6"
    role="dialog" aria-modal="true" aria-labelledby="product-detail-title"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="relative my-auto grid w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:grid-cols-2">
      <button type="button" onClick={onClose} aria-label="Close product details"
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-100 bg-white text-zinc-600 shadow-sm hover:text-brand-pink">
        <X size={18}/>
      </button>

      <div className="flex min-h-64 flex-col items-center justify-center gap-5 bg-[#F9FAFB] p-8 sm:min-h-[420px]">
        {product.image_url
          ? <div className="relative h-56 w-full sm:h-64">
              <Image src={product.image_url} alt={product.name} fill className="object-contain mix-blend-multiply" sizes="(max-width: 640px) 90vw, 380px" />
            </div>
          : <div className="flex h-40 w-40 items-center justify-center rounded-full bg-pink-50 text-5xl" aria-hidden="true">🐾</div>}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"/>Available in-store
        </span>
      </div>

      <div className="flex flex-col p-6 sm:p-7">
        <div className="mb-2 flex flex-wrap items-center gap-2 pr-10">
          {petTypes.map((type) => <span key={type} className={`rounded-full border px-2.5 py-0.5 text-xs font-bold capitalize ${PET_BADGE[type] ?? "border-pink-100 bg-brand-tint text-brand-pink"}`}>{type}</span>)}
          <span className="text-sm text-zinc-400">{product.category}</span>
        </div>
        <h2 id="product-detail-title" className="pr-8 text-xl font-extrabold leading-snug text-zinc-900 sm:text-2xl">{product.name}</h2>
        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="text-sm text-zinc-500">Unit / Size: <span className="font-semibold text-zinc-700">{size}</span></p>
          <p className="shrink-0 text-2xl font-extrabold text-brand-pink sm:text-3xl">{formatPeso(product.price)}</p>
        </div>

        <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-zinc-600">
          {description || "Product details are being updated. Ask our staff in-store for more information."}
        </p>

        <div className="mt-6 border-t border-zinc-100 pt-5">
          <div className="flex items-start gap-3 rounded-2xl border border-pink-100 bg-brand-tint p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-pink text-white"><MapPin size={18}/></span>
            <div>
              <p className="text-sm font-bold text-zinc-900">Available in-store at Happy Tails</p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">Visit our shop counter to purchase. Stock may change based on current store inventory.</p>
            </div>
          </div>
        </div>

        <button type="button" onClick={onClose} className="mt-auto pt-6">
          <span className="block w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800">Close</span>
        </button>
      </div>
    </div>
  </div>;
}
