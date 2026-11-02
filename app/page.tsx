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
import BranchesCarousel from '@/components/landing/BranchesCarousel';
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
import type { WebsiteBranch } from '@/lib/types/website-branches';
import type { Package, PackagePricing, PackageInclusion, PetSize } from '@/lib/types/services';
import type { PublicPricingCatalog } from '@/lib/landing/public-pricing';
import { copy, type WebsiteService } from '@/lib/website/catalog';

// Public service prices must reflect the latest database values at the next
// page request (without a redeploy or an outdated static page cache).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await createClient();
  const [settingsResult, heroResult, productsResult, galleryPhotos, serviceResult, textResult, branchResult, packageResult, sizeResult] = await Promise.all([
    db.from('site_settings').select('*'),
    db.from('hero_slides').select('*').eq('active', true).order('sort_order', { ascending: true }),
    db.from('products').select('*').eq('status', 'active').order('product_code'),
    fetchActiveGalleryPhotos(),
    db.from('website_services').select('*').eq('published', true).order('sort_order', { ascending: true }),
    db.from('website_text').select('key,value'),
    db.from('website_branches').select('*').eq('published', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
    db.from('packages').select('id,service_type,name,sort_order,is_active')
      .in('service_type', ['dog_grooming', 'cat_grooming', 'boarding']).eq('is_active', true).order('sort_order'),
    db.from('pet_sizes').select('id,service_type,label,weight_range,sort_order,is_active')
      .in('service_type', ['dog_grooming', 'cat_grooming']).order('sort_order'),
  ]);

  const packages = (packageResult.data ?? []) as Package[];
  const packageIds = packages.map(pkg => pkg.id);
  const [pricingResult, inclusionResult] = packageResult.error || !packageIds.length
    ? [null, null]
    : await Promise.all([
      db.from('package_pricing').select('id,package_id,size_id,size_label,size_detail,price,is_per_night,nights')
        .in('package_id', packageIds),
      db.from('package_inclusions').select('id,package_id,label,sort_order')
        .in('package_id', packageIds).order('sort_order'),
    ]);

  if (packageResult.error || sizeResult.error || pricingResult?.error || inclusionResult?.error) {
    // Server log only: never expose raw database or permission details on the public page.
    console.error('[HappyTails public pricing] Could not load active service rates:',
      packageResult.error?.message ?? sizeResult.error?.message ??
      pricingResult?.error?.message ?? inclusionResult?.error?.message);
  }

  const pricingCatalog: PublicPricingCatalog = {
    packages,
    pricing: (pricingResult?.data ?? []) as PackagePricing[],
    sizes: (sizeResult.data ?? []) as PetSize[],
    inclusions: (inclusionResult?.data ?? []) as PackageInclusion[],
    loaded: !packageResult.error && !sizeResult.error &&
      (packageIds.length === 0 || (!pricingResult?.error && !inclusionResult?.error)),
  };

  const settings = (settingsResult.data ?? []) as SiteSetting[];
  const get = (key: string) => settings.find(s => s.key === key);
  const text = Object.fromEntries((textResult.data ?? []).map(item => [item.key, item.value])) as Record<string, string>;
  const services = (serviceResult.data ?? []) as WebsiteService[];
  const branches = (branchResult.data ?? []) as WebsiteBranch[];
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
        <GroomingPricing catalog={pricingCatalog} basicImage={get('grooming_basic_image')?.image_url} diamondImage={get('grooming_diamond_image')?.image_url} premiumImage={get('grooming_premium_image')?.image_url} />
        <BoardingBanner backgroundUrl={get('boarding_banner_background')?.image_url} width={get('boarding_banner_background')?.image_width} height={get('boarding_banner_background')?.image_height} />
        <BoardingPricing catalog={pricingCatalog} smallKennelImage={get('boarding_small_kennel_image')?.image_url} bigKennelImage={get('boarding_big_kennel_image')?.image_url} />
        <SpaBanner backgroundUrl={get('spa_banner_background')?.image_url} width={get('spa_banner_background')?.image_width} height={get('spa_banner_background')?.image_height} />
        <SpaBenefits />
        <ProductsCarousel products={(productsResult.data ?? []) as Product[]} />
        <BranchesCarousel branches={branches} />
        <DynamicAbout backgroundUrl={get('about_us_background')?.image_url} heading={copy('about_heading', text)} description={copy('about_description', text)} />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
