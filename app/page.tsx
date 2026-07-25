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

export default async function Home() {
  // Fetch each section's current background from site_settings. This is a
  // Server Component, so this runs on the server before any HTML is sent —
  // if Website Management has never been used for a section, image_url is
  // null and the component below falls back to its bundled default.
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("*");
  const settings = (data as SiteSetting[]) ?? [];
  const get = (key: string) => settings.find((s) => s.key === key);

  const hero = get("hero_background");
  const grooming = get("grooming_banner_background");
  const boarding = get("boarding_banner_background");
  const spa = get("spa_banner_background");
  const about = get("about_us_background");

  return (
    <PoliciesModalProvider>
      <Navbar />
      <main>
        <Hero backgroundUrl={hero?.image_url} />
        <Services />
        <GroomingBanner backgroundUrl={grooming?.image_url} width={grooming?.image_width} height={grooming?.image_height} />
        <GroomingPricing />
        <BoardingBanner backgroundUrl={boarding?.image_url} width={boarding?.image_width} height={boarding?.image_height} />
        <BoardingPricing />
        <SpaBanner backgroundUrl={spa?.image_url} width={spa?.image_width} height={spa?.image_height} />
        <SpaBenefits />
        <ProductsCarousel />
        <AboutUs backgroundUrl={about?.image_url} />
        <Gallery />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
