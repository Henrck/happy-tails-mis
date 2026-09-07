"use client";
// "Our Products" section on the homepage: category filter + a carousel of
// product cards, paged with the left/right arrows (4 cards per page on
// desktop, fewer on mobile via CSS scroll-snap so nothing looks broken).
// This is a teaser — the full catalog lives on the separate /products page.
//
// REAL REWIRE: this used to read a static mock file. `products` is now
// the REAL active POS catalog, fetched server-side in app/page.tsx and
// passed down as a prop — same pattern as site_settings/hero_slides.
import { useState, useMemo } from "react";
import Link from "next/link";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";

const PAGE_SIZE = 4;

export default function ProductsCarousel({ products }: { products: Product[] }) {
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
    setPage(0); // reset paging whenever the filter changes
  }

  function prev() {
    setPage((p) => (p - 1 + pageCount) % pageCount);
  }

  function next() {
    setPage((p) => (p + 1) % pageCount);
  }

  return (
    <section id="products" className="bg-brand-pink py-14">
      <div className="site-container">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
          Our Products
        </h2>
        <p className="mt-2 text-white/90 text-center text-sm md:text-base">
          Browse what&apos;s available at our shop — visit us in person to
          purchase
        </p>

        <div className="mt-6">
          <CategoryTabs active={category} onChange={changeCategory} />
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-white/90 text-center text-sm">
            No products in this category yet.
          </p>
        ) : (
          <div className="mt-8 relative flex items-center justify-center gap-2 md:gap-3">
            <button
              onClick={prev}
              aria-label="Previous products"
              className="shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-sky-400 hover:bg-sky-500 text-white flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {visible.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Next products"
              className="shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-sky-400 hover:bg-sky-500 text-white flex items-center justify-center transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/products"
            className="inline-block bg-white text-brand-pink font-semibold text-sm px-6 py-2 rounded-full hover:bg-pink-50 transition-colors"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
