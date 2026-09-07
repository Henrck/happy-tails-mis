"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";

const PAGE_SIZE = 4;
const AUTOPLAY_MS = 3000;

export default function ProductsCarousel({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const filtered = useMemo(() => category === "all" ? products : products.filter((p) => p.category === category), [products, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  function changeCategory(next: ProductCategory | "all") { setCategory(next); setPage(0); }
  function prev() { setPage((p) => (p - 1 + pageCount) % pageCount); }
  function next() { setPage((p) => (p + 1) % pageCount); }
  useEffect(() => { if (pageCount <= 1 || paused) return; const timer = window.setInterval(() => setPage((p) => (p + 1) % pageCount), AUTOPLAY_MS); return () => window.clearInterval(timer); }, [pageCount, paused]);
  return <section id="products" className="bg-brand-pink py-8 md:py-9 lg:py-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}><div className="site-container"><h2 className="text-center text-2xl font-bold text-white md:text-3xl">Our Products</h2><p className="mt-2 text-center text-sm text-white/90 md:text-base">Browse what&apos;s available at our shop — visit us in person to purchase</p><div className="mt-4"><CategoryTabs active={category} onChange={changeCategory}/></div>{visible.length === 0 ? <p className="mt-10 text-center text-sm text-white/90">No products in this category yet.</p> : <div className="relative mt-5 flex items-center justify-center gap-2 md:gap-3"><button onClick={prev} aria-label="Previous products" className="h-8 w-8 shrink-0 rounded-full bg-sky-400 text-white transition-colors hover:bg-sky-500 md:h-9 md:w-9">‹</button><div className="grid min-w-0 flex-1 grid-cols-2 items-stretch gap-3 md:grid-cols-4 md:gap-4">{visible.map((product) => <ProductCard key={product.id} product={product}/>)}</div><button onClick={next} aria-label="Next products" className="h-8 w-8 shrink-0 rounded-full bg-sky-400 text-white transition-colors hover:bg-sky-500 md:h-9 md:w-9">›</button></div>}<div className="mt-5 text-center"><Link href="/products" className="inline-block rounded-full bg-white px-6 py-2 text-sm font-semibold text-brand-pink transition-colors hover:bg-pink-50">View All Products</Link></div></div></section>;
}
