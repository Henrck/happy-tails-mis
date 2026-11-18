"use client";
// Shop shelf: an intro panel beside a swipeable row of product cards,
// filtered by category, with the shared product details pop-up.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Store } from "lucide-react";
import type { Product, ProductCategory } from "@/lib/types/products";
import ProductCard from "@/components/products/ProductCard";
import ProductDetailDialog from "@/components/products/ProductDetailDialog";
import CategoryTabs from "@/components/products/CategoryTabs";

export default function HomeProducts({ products, heading, subheading }: { products: Product[]; heading: string; subheading: string }) {
  const [category, setCategory] = useState<ProductCategory | "all">("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => (category === "all" ? products : products.filter((p) => p.category === category)), [products, category]);

  const scroll = (direction: number) => {
    const el = shelf.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const changeCategory = (next: ProductCategory | "all") => {
    setCategory(next);
    shelf.current?.scrollTo({ left: 0 });
  };

  return <section id="products" className="py-20 lg:py-24">
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="grid gap-6 rounded-[30px] bg-[#2A1626] p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-pink-light"><Store size={15}/> In-store pet shop</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">{heading}</h2>
          <p className="mt-3 max-w-xl text-base text-white/70">{subheading}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-white/60"><span className="font-heading text-3xl font-bold text-white">{products.length}</span> items on our shelves</p>
          <Link href="/products" className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-pink px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-pink-dark">View all <ArrowRight size={16}/></Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1 [&>div]:sm:justify-start"><CategoryTabs active={category} onChange={changeCategory}/></div>
        {shown.length > 2 && <div className="hidden gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll products left" className="flex h-10 w-10 items-center justify-center rounded-full border border-pink-200 bg-white text-brand-pink hover:bg-brand-pink hover:text-white"><ChevronLeft size={19}/></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll products right" className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-pink text-white hover:bg-brand-pink-dark"><ChevronRight size={19}/></button>
        </div>}
      </div>

      {shown.length === 0
        ? <p className="mt-8 rounded-[22px] border border-dashed border-pink-200 p-10 text-center text-sm text-zinc-500">No products in this category yet.</p>
        : <div ref={shelf} className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
            {shown.map((product) => <div key={product.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%]">
              <ProductCard product={product} onView={() => setSelected(product)}/>
            </div>)}
          </div>}
    </div>
    {selected && <ProductDetailDialog product={selected} onClose={() => setSelected(null)}/>}
  </section>;
}
