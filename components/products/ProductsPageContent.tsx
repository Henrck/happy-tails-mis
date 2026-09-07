"use client";

import { useMemo, useState } from "react";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import CategoryTabs from "@/components/products/CategoryTabs";

const PAGE_SIZE = 10;

export default function ProductsPageContent({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => category === "all" ? products : products.filter((p) => p.category === category), [products, category]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  function changeCategory(next: ProductCategory | "all") { setCategory(next); setPage(0); }
  return <><div className="mt-6"><CategoryTabs active={category} onChange={changeCategory}/></div><div className="site-container mt-8 rounded-3xl bg-brand-pink p-5 sm:p-6 md:p-8">{visible.length === 0 ? <p className="py-10 text-center text-white">No products in this category yet.</p> : <div className="grid grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-5">{visible.map((product) => <ProductCard key={product.id} product={product}/>)}</div>}{pageCount > 1 && <div className="mt-8 flex justify-center gap-2">{Array.from({ length: pageCount }).map((_, i) => <button key={i} onClick={() => setPage(i)} className={`h-9 w-9 rounded-full text-sm font-semibold transition-colors ${currentPage === i ? "bg-white text-brand-pink" : "bg-pink-400 text-white hover:bg-pink-300"}`} aria-label={`Go to product page ${i + 1}`}>{i + 1}</button>)}</div>}</div></>;
}
