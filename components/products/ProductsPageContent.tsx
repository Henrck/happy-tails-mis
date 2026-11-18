"use client";
import ProductDetailDialog from "@/components/products/ProductDetailDialog";

import { useMemo, useState } from "react";
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

      {selected && <ProductDetailDialog product={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
