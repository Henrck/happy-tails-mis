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
import type { SiteSetting } from "@/lib/supabase/site-settings";
import type { HeroSlide } from "@/lib/types/hero-slides";
import type { Product } from "@/lib/types/products";

export default async function Home() {
  const supabase = await createClient();
  const [{ data }, { data: heroSlidesData }, { data: productsData }] = await Promise.all([
    supabase.from("site_settings").select("*"),
    supabase.from("hero_slides").select("*").eq("active", true).order("sort_order", { ascending: true }),
    supabase.from("products").select("*").eq("status", "active").order("product_code"),
  ]);
  const settings = (data as SiteSetting[]) ?? [];
  const heroSlides = (heroSlidesData as HeroSlide[]) ?? [];
  const products = (productsData as Product[]) ?? [];
  const get = (key: string) => settings.find((s) => s.key === key);

  const logo = get("site_logo");
  const servicesGrooming = get("services_grooming_image");
  const servicesBoarding = get("services_boarding_image");
  const servicesSpa = get("services_spa_image");
  const grooming = get("grooming_banner_background");
  const boarding = get("boarding_banner_background");
  const spa = get("spa_banner_background");
  const about = get("about_us_background");

  return (
    <PoliciesModalProvider>
      <Navbar logoUrl={logo?.image_url} />
      <main>
        <Hero slides={heroSlides} logoUrl={logo?.image_url} />
        <Services
          groomingImage={servicesGrooming?.image_url}
          boardingImage={servicesBoarding?.image_url}
          spaImage={servicesSpa?.image_url}
        />
        <GroomingBanner backgroundUrl={grooming?.image_url} width={grooming?.image_width} height={grooming?.image_height} />
        <GroomingPricing />
        <BoardingBanner backgroundUrl={boarding?.image_url} width={boarding?.image_width} height={boarding?.image_height} />
        <BoardingPricing />
        <SpaBanner backgroundUrl={spa?.image_url} width={spa?.image_width} height={spa?.image_height} />
        <SpaBenefits />
        <ProductsCarousel products={products} />
        <AboutUs backgroundUrl={about?.image_url} />
        <Gallery />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
