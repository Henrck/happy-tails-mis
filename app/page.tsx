import Hero from '@/components/landing/Hero';
import Navbar from '@/components/landing/Navbar';
import DynamicServices from '@/components/landing/DynamicServices';
import GroomingBanner from '@/components/landing/GroomingBanner';
import GroomingPricing from '@/components/landing/GroomingPricing';
import BoardingBanner from '@/components/landing/BoardingBanner';
import BoardingPricing from '@/components/landing/BoardingPricing';
import SpaBanner from '@/components/landing/SpaBanner';
import SpaBenefits from '@/components/landing/SpaBenefits';
import ProductsCarousel from '@/components/landing/ProductsCarousel';
import DynamicAbout from '@/components/landing/DynamicAbout';
import Gallery from '@/components/landing/Gallery';
import Footer from '@/components/landing/Footer';
import { PoliciesModalProvider } from '@/components/landing/PoliciesModalContext';
import PoliciesModal from '@/components/landing/PoliciesModal';
import { createClient } from '@/lib/supabase/server';
import { fetchActiveGalleryPhotos } from '@/lib/supabase/gallery';
import type { SiteSetting } from '@/lib/supabase/site-settings';
import type { HeroSlide } from '@/lib/types/hero-slides';
import type { Product } from '@/lib/types/products';
import { copy, type WebsiteService } from '@/lib/website/catalog';

export default async function Home() {
  const db = await createClient();
  const [settingsResult, heroResult, productsResult, galleryPhotos, serviceResult, textResult] = await Promise.all([
    db.from('site_settings').select('*'),
    db.from('hero_slides').select('*').eq('active', true).order('sort_order', { ascending: true }),
    db.from('products').select('*').eq('status', 'active').order('product_code'),
    fetchActiveGalleryPhotos(),
    db.from('website_services').select('*').eq('published', true).order('sort_order', { ascending: true }),
    db.from('website_text').select('key,value'),
  ]);

  const settings = (settingsResult.data ?? []) as SiteSetting[];
  const get = (key: string) => settings.find(s => s.key === key);
  const text = Object.fromEntries((textResult.data ?? []).map(item => [item.key, item.value])) as Record<string, string>;
  const services = (serviceResult.data ?? []) as WebsiteService[];
  const imageDefaults: Record<string, string | undefined> = {
    'pet-grooming': get('services_grooming_image')?.image_url ?? undefined,
    'pet-boarding': get('services_boarding_image')?.image_url ?? undefined,
    'pet-spa': get('services_spa_image')?.image_url ?? undefined,
  };
  const shownServices = services.map(s => ({ ...s, image_url: s.image_url ?? imageDefaults[s.slug] ?? null }));

  return (
    <PoliciesModalProvider>
      <Navbar logoUrl={get('site_logo')?.image_url} />
      <main>
        <Hero slides={(heroResult.data ?? []) as HeroSlide[]} logoUrl={get('site_logo')?.image_url} />
        {shownServices.length > 0 && (
          <DynamicServices services={shownServices} heading={copy('services_heading', text)} subheading={copy('services_subheading', text)} />
        )}
        <Gallery photos={galleryPhotos} heading={copy('gallery_heading', text)} subheading={copy('gallery_subheading', text)} />
        <GroomingBanner backgroundUrl={get('grooming_banner_background')?.image_url} width={get('grooming_banner_background')?.image_width} height={get('grooming_banner_background')?.image_height} />
        <GroomingPricing basicImage={get('grooming_basic_image')?.image_url} diamondImage={get('grooming_diamond_image')?.image_url} premiumImage={get('grooming_premium_image')?.image_url} />
        <BoardingBanner backgroundUrl={get('boarding_banner_background')?.image_url} width={get('boarding_banner_background')?.image_width} height={get('boarding_banner_background')?.image_height} />
        <BoardingPricing smallKennelImage={get('boarding_small_kennel_image')?.image_url} bigKennelImage={get('boarding_big_kennel_image')?.image_url} />
        <SpaBanner backgroundUrl={get('spa_banner_background')?.image_url} width={get('spa_banner_background')?.image_width} height={get('spa_banner_background')?.image_height} />
        <SpaBenefits />
        <ProductsCarousel products={(productsResult.data ?? []) as Product[]} />
        <DynamicAbout backgroundUrl={get('about_us_background')?.image_url} heading={copy('about_heading', text)} description={copy('about_description', text)} />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
