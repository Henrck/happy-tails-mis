"use client";
// "Our Products" section on the homepage: category filter + a carousel of
// product cards, paged with the left/right arrows (4 cards per page on
// desktop, fewer on mobile via CSS scroll-snap so nothing looks broken).
// This is a teaser — the full catalog lives on the separate /products page.
import { useState, useMemo } from "react";
import Link from "next/link";
import { products, type ProductCategory } from "@/lib/data/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";

const PAGE_SIZE = 4;

export default function ProductsCarousel() {
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

        <div className="mt-8 relative flex items-center justify-center gap-3">
          <button
            onClick={prev}
            aria-label="Previous products"
            className="shrink-0 w-9 h-9 rounded-full bg-sky-400 hover:bg-sky-500 text-white flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next products"
            className="shrink-0 w-9 h-9 rounded-full bg-sky-400 hover:bg-sky-500 text-white flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

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
