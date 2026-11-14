// Public product catalog. Uses the existing Supabase products table and active status.
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types/products";
import Navbar from "@/components/landing/Navbar";
import ProductsPageContent from "@/components/products/ProductsPageContent";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("product_code");
  const products = error ? [] : ((data ?? []) as Product[]);

  return (
    <main className="min-h-screen bg-[#FDF8FA]">
      <Navbar />
      <div className="pb-14 pt-9 sm:pt-12">
        <header className="site-container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-brand-tint px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-pink">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-pink" />
            HappyTails Storefront
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">Our Products</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Browse our selection of pet nutrition, treats, grooming essentials, and everyday accessories available at HappyTails.
          </p>
        </header>
        <ProductsPageContent products={products} />
      </div>
    </main>
  );
}
