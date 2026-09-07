// Full product catalog page — reached via "Products" in the main nav.
// REAL REWIRE: this used to import the static mock catalog. Now fetches
// the REAL active POS products server-side (same pattern as the
// homepage), same filtering as the homepage carousel, but shows
// everything in a grid with numbered pagination instead of arrows.
import { createClient } from "@/lib/supabase/server";
import type { Product } from "@/lib/types/products";
import Navbar from "@/components/landing/Navbar";
import ProductsPageContent from "@/components/products/ProductsPageContent";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("product_code");
  const products = (data as Product[]) ?? [];

  return (
    <main className="min-h-screen bg-brand-tint">
      <Navbar />

      <div className="py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 text-center">
          Our Products
        </h1>

        <ProductsPageContent products={products} />
      </div>
    </main>
  );
}
