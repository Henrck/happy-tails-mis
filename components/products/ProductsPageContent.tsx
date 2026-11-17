"use client";
import { formatPeso } from "@/lib/utils/currency";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { PetType, Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import PetTypeTabs from "@/components/products/PetTypeTabs";

const PAGE_SIZE = 8;
type SortOption = "featured" | "price-asc" | "price-desc" | "name-asc";

const categories: { label: string; value: ProductCategory | "all" }[] = [
  { label: "All Categories", value: "all" },
  { label: "Food", value: "Food" },
  { label: "Treats", value: "Treats" },
  { label: "Grooming", value: "Grooming" },
  { label: "Accessories", value: "Accessories" },
  { label: "Hygiene", value: "Hygiene" },
];


export default function ProductsPageContent({ products }: { products: Product[] }) {
  const [petType, setPetType] = useState<PetType | "all">("all");
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const assignedPetTypes = Array.isArray(product.pet_types) ? product.pet_types : [];
      const matchesPetType = petType === "all" || assignedPetTypes.includes(petType);
      const matchesCategory = category === "all" || product.category === category;
      const search = query.trim().toLocaleLowerCase();
      const matchesSearch =
        !search ||
        [
          product.name,
          product.product_code,
          product.category,
          product.package_size,
          product.unit,
          product.description,
        ].some((value) => String(value ?? "").toLocaleLowerCase().includes(search));

      return matchesPetType && matchesCategory && matchesSearch;
    });

    if (sort === "price-asc") result = [...result].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-desc") result = [...result].sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name-asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [products, petType, category, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasFilters =
    petType !== "all" || category !== "all" || query.trim() !== "" || sort !== "featured";

  function resetFilters() {
    setPetType("all");
    setCategory("all");
    setQuery("");
    setSort("featured");
    setPage(0);
  }

  function changePetType(next: PetType | "all") {
    setPetType(next);
    setPage(0);
  }

  function changeCategory(next: ProductCategory | "all") {
    setCategory(next);
    setPage(0);
  }

  return (
    <>
      <section className="site-container mt-7 space-y-5" aria-label="Product filters">
        <PetTypeTabs active={petType} onChange={changePetType} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-md">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(0); }}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full rounded-full border border-pink-100 bg-white py-3 pl-11 pr-10 text-sm text-zinc-800 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-pink focus:ring-4 focus:ring-pink-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setPage(0); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-pink-50 hover:text-brand-pink"
              >
                ×
              </button>
            )}
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-2 text-xs font-medium text-zinc-500 sm:flex-none">
              <span className="whitespace-nowrap">Category</span>
              <select
                value={category}
                onChange={(event) => changeCategory(event.target.value as ProductCategory | "all")}
                aria-label="Filter by category"
                className="min-w-0 flex-1 cursor-pointer rounded-full border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm outline-none focus:border-brand-pink sm:w-48"
              >
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-1 items-center gap-2 text-xs font-medium text-zinc-500 sm:flex-none">
              <span className="whitespace-nowrap">Sort by</span>
              <select
                value={sort}
                onChange={(event) => { setSort(event.target.value as SortOption); setPage(0); }}
                className="min-w-0 flex-1 cursor-pointer rounded-full border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 shadow-sm outline-none focus:border-brand-pink sm:w-48"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </label>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="whitespace-nowrap text-xs font-bold text-brand-pink hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
          <p aria-live="polite">
            {filtered.length === 0
              ? "No products found"
              : `Showing ${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length} products`}
          </p>
          <span className="hidden sm:inline">Prices in Philippine pesos (₱)</span>
        </div>
      </section>

      <section className="site-container mt-5" aria-label="Product catalog">
        {visible.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-pink-100 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-2xl">⌕</div>
            <h2 className="text-lg font-bold text-zinc-900">No matching products found</h2>
            <p className="mt-1 text-sm text-zinc-500">Try another search term or adjust your pet type or category filter.</p>
            <button type="button" onClick={resetFilters} className="mt-5 rounded-full bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-pink-dark">
              Show all products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:gap-6">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} onView={() => setSelected(product)} />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <nav aria-label="Product pages" className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <button type="button" disabled={currentPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-40">
              Previous
            </button>
            {Array.from({ length: pageCount }, (_, index) => (
              <button key={index} type="button" onClick={() => setPage(index)} aria-current={currentPage === index ? "page" : undefined} className={`h-9 w-9 rounded-full text-sm font-bold transition ${currentPage === index ? "bg-brand-pink text-white shadow-sm" : "border border-pink-100 bg-white text-zinc-600 hover:border-brand-pink hover:text-brand-pink"}`}>
                {index + 1}
              </button>
            ))}
            <button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} className="rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-brand-pink hover:text-brand-pink disabled:cursor-not-allowed disabled:opacity-40">
              Next
            </button>
          </nav>
        )}
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-zinc-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}
        >
          <div className="relative my-auto grid w-full max-w-3xl overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl sm:grid-cols-2">
            <button type="button" onClick={() => setSelected(null)} aria-label="Close product details" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-100 bg-white/95 text-xl text-zinc-500 shadow-sm hover:text-brand-pink">
              ×
            </button>
            <div className="relative flex min-h-64 items-center justify-center bg-[#F9FAFB] p-8 sm:min-h-[390px]">
              {selected.image_url ? (
                <div className="relative h-56 w-full">
                  <Image src={selected.image_url} alt={selected.name} fill className="object-contain mix-blend-multiply" sizes="(max-width: 640px) 90vw, 360px" />
                </div>
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-full bg-pink-50 text-5xl">🐾</div>
              )}
            </div>
            <div className="flex flex-col p-6 sm:p-8">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-pink-100 bg-brand-tint px-3 py-1 text-[11px] font-bold text-brand-pink">{selected.category}</span>
                <span className="text-xs text-zinc-400">Product code: {selected.product_code}</span>
              </div>
              <h2 id="product-detail-title" className="pr-8 text-xl font-extrabold leading-snug text-zinc-900 sm:text-2xl">{selected.name}</h2>
              <p className="mt-3 text-2xl font-extrabold text-brand-pink">{formatPeso(selected.price)}</p>

              <div className="mt-5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Brief Description</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                  {selected.description?.trim() || "Product details are being updated."}
                </p>
              </div>

              <dl className="mt-5 divide-y divide-pink-50 rounded-2xl border border-pink-100 px-4">
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-zinc-500">Unit</dt>
                  <dd className="text-right font-semibold text-zinc-800">{selected.unit}</dd>
                </div>
                {selected.package_size && (
                  <div className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-zinc-500">Package Size</dt>
                    <dd className="text-right font-semibold text-zinc-800">{selected.package_size}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="text-right font-semibold text-zinc-800">{selected.category}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-zinc-500">Availability</dt>
                  <dd className="text-right font-semibold text-emerald-700">Available in-store</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-zinc-500">Visit HappyTails to purchase this product. Availability may change based on current store inventory.</p>
              <button type="button" onClick={() => setSelected(null)} className="mt-auto pt-7">
                <span className="block w-full rounded-xl bg-brand-pink px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-pink-dark">Close details</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
