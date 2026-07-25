"use client";
// Full product catalog page — reached via "Products" in the main nav.
// Same filtering as the homepage carousel, but shows everything in a grid
// with numbered pagination instead of arrows.
import { useState, useMemo } from "react";
import { products, type ProductCategory } from "@/lib/data/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";
import Navbar from "@/components/landing/Navbar";

const PAGE_SIZE = 10; // 5 columns x 2 rows on desktop, matches the design

export default function ProductsPage() {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter((p) => p.category === category),
    [category]
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
    <main className="min-h-screen bg-brand-tint">
      <Navbar />

      <div className="py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 text-center">
          Our Products
        </h1>

        <div className="mt-6">
          <CategoryTabs active={category} onChange={changeCategory} />
        </div>

        <div className="mt-8 site-container bg-brand-pink rounded-3xl p-6 md:p-8">
          {visible.length === 0 ? (
            <p className="text-white text-center py-10">
              No products in this category yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 justify-items-center">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <div className="mt-8 flex justify-center gap-2">
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
      </div>
    </main>
  );
}
