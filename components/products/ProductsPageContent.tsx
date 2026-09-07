"use client";
// Client half of the /products page — category filtering + numbered
// pagination over whatever product list the server component fetched.
// Split out from page.tsx so the actual Supabase fetch stays server-side
// (same pattern as the rest of the site) while this stays interactive.
import { useState, useMemo } from "react";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";

const PAGE_SIZE = 10; // 5 columns x 2 rows on desktop, matches the design

export default function ProductsPageContent({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter((p) => p.category === category),
    [products, category]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE
  );

  function changeCategory(next: ProductCategory | "all") {
    setCategory(next);
    setPage(0);
  }

  return (
    <>
      <div className="mt-6">
        <CategoryTabs active={category} onChange={changeCategory} />
      </div>

      <div className="mt-8 site-container bg-brand-pink rounded-3xl p-4 sm:p-6 md:p-8">
        {visible.length === 0 ? (
          <p className="text-white text-center py-10">
            No products in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-5 justify-items-center">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  currentPage === i
                    ? "bg-white text-brand-pink"
                    : "bg-pink-400 text-white hover:bg-pink-300"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
