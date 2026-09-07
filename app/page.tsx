import Hero from "@/components/landing/Hero";
import Navbar from "@/components/landing/Navbar";
import Services from "@/components/landing/Services";
import GroomingBanner from "@/components/landing/GroomingBanner";
import GroomingPricing from "@/components/landing/GroomingPricing";
import BoardingBanner from "@/components/landing/BoardingBanner";
import BoardingPricing from "@/components/landing/BoardingPricing";
import SpaBanner from "@/components/landing/SpaBanner";
import SpaBenefits from "@/components/landing/SpaBenefits";
import ProductsCarousel from "@/components/landing/ProductsCarousel";
import AboutUs from "@/components/landing/AboutUs";
import Gallery from "@/components/landing/Gallery";
import Footer from "@/components/landing/Footer";
import { PoliciesModalProvider } from "@/components/landing/PoliciesModalContext";
import PoliciesModal from "@/components/landing/PoliciesModal";
import { createClient } from "@/lib/supabase/server";
import { fetchActiveGalleryPhotos } from "@/lib/supabase/gallery";
import type { SiteSetting } from "@/lib/supabase/site-settings";
import type { HeroSlide } from "@/lib/types/hero-slides";
import type { Product } from "@/lib/types/products";

export default async function Home() {
  const supabase = await createClient();
  const [{ data }, { data: heroSlidesData }, { data: productsData }, galleryPhotos] =
    await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("hero_slides").select("*").eq("active", true).order("sort_order", { ascending: true }),
      supabase.from("products").select("*").eq("status", "active").order("product_code"),
      fetchActiveGalleryPhotos(),
    ]);

  const settings = (data as SiteSetting[]) ?? [];
  const heroSlides = (heroSlidesData as HeroSlide[]) ?? [];
  const products = (productsData as Product[]) ?? [];
  const get = (key: string) => settings.find((s) => s.key === key);

  return (
    <PoliciesModalProvider>
      <Navbar logoUrl={get("site_logo")?.image_url} />
      <main>
        <Hero slides={heroSlides} logoUrl={get("site_logo")?.image_url} />
        <Services
          groomingImage={get("services_grooming_image")?.image_url}
          boardingImage={get("services_boarding_image")?.image_url}
          spaImage={get("services_spa_image")?.image_url}
        />
        <GroomingBanner backgroundUrl={get("grooming_banner_background")?.image_url} width={get("grooming_banner_background")?.image_width} height={get("grooming_banner_background")?.image_height} />
        <GroomingPricing
          basicImage={get("grooming_basic_image")?.image_url}
          diamondImage={get("grooming_diamond_image")?.image_url}
          premiumImage={get("grooming_premium_image")?.image_url}
        />
        <BoardingBanner backgroundUrl={get("boarding_banner_background")?.image_url} width={get("boarding_banner_background")?.image_width} height={get("boarding_banner_background")?.image_height} />
        <BoardingPricing
          smallKennelImage={get("boarding_small_kennel_image")?.image_url}
          bigKennelImage={get("boarding_big_kennel_image")?.image_url}
        />
        <SpaBanner backgroundUrl={get("spa_banner_background")?.image_url} width={get("spa_banner_background")?.image_width} height={get("spa_banner_background")?.image_height} />
        <SpaBenefits />
        <ProductsCarousel products={products} />
        <AboutUs backgroundUrl={get("about_us_background")?.image_url} />
        <Gallery photos={galleryPhotos} />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
