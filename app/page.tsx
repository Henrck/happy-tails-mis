import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import HomeHero from '@/components/landing/home/HomeHero';
import HomeBeforeAfter from '@/components/landing/home/HomeBeforeAfter';
import HomeServices from '@/components/landing/home/HomeServices';
import { buildServicePanels, HomeCta } from '@/components/landing/home/homeContent';
import HomeProducts from '@/components/landing/home/HomeProducts';
import HomeBranches from '@/components/landing/home/HomeBranches';
import { HomeAbout, HomeFaq } from '@/components/landing/home/HomeAboutFaq';
import { FAQ_TEXT_KEY, parseFAQs } from '@/lib/website/faq';
import HomepageSeo from '@/components/seo/HomepageSeo';
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
import { copy, type WebsitePackageMedia, type WebsiteService } from '@/lib/website/catalog';

export const metadata: Metadata = {
  title: { absolute: 'Happy Tails Pet Grooming Cafe | Noveleta, Cavite' },
  description: 'Visit Happy Tails Pet Grooming Cafe in Noveleta, Cavite for pet grooming, boarding, spa care and pet supplies. Explore our services and book online.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website', locale: 'en_PH', siteName: 'Happy Tails Pet Grooming Cafe',
    title: 'Happy Tails Pet Grooming Cafe | Noveleta, Cavite',
    description: 'Pet grooming, boarding, spa services, and pet supplies in Noveleta, Cavite. Explore Happy Tails and book online.',
    url: '/', images: [{ url: '/images/hero-bg.png', alt: 'Happy Tails Pet Grooming Cafe' }],
  },
  twitter: {
    card: 'summary_large_image', title: 'Happy Tails Pet Grooming Cafe | Noveleta, Cavite',
    description: 'Pet grooming, boarding, spa services, and pet supplies in Noveleta, Cavite.', images: ['/images/hero-bg.png'],
  },
};

// Show the latest published text and service prices on every new page request.
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
  const [pricingResult, inclusionResult, mediaResult] = packageResult.error || !packageIds.length
    ? [null, null, null]
    : await Promise.all([
      db.from('package_pricing').select('id,package_id,size_id,size_label,size_detail,price,is_per_night,nights').in('package_id', packageIds),
      db.from('package_inclusions').select('id,package_id,label,sort_order').in('package_id', packageIds).order('sort_order'),
      db.from('website_package_media').select('package_id,image_url,description,published').in('package_id', packageIds),
    ]);
  // Package photos are optional; the cards fall back to their default photos.
  if (mediaResult?.error) console.error('[HappyTails package media] Could not load package photos:', mediaResult.error.message);
  if (packageResult.error || sizeResult.error || pricingResult?.error || inclusionResult?.error) {
    console.error('[HappyTails public pricing] Could not load active service rates:',
      packageResult.error?.message ?? sizeResult.error?.message ?? pricingResult?.error?.message ?? inclusionResult?.error?.message);
  }
  if (textResult.error) console.error('[HappyTails website text] Failed to read published content:', textResult.error.message);
  const catalog: PublicPricingCatalog = {
    packages, pricing: (pricingResult?.data ?? []) as PackagePricing[],
    sizes: (sizeResult.data ?? []) as PetSize[], inclusions: (inclusionResult?.data ?? []) as PackageInclusion[],
    loaded: !packageResult.error && !sizeResult.error &&
      (packageIds.length === 0 || (!pricingResult?.error && !inclusionResult?.error)),
  };
  const settings = (settingsResult.data ?? []) as SiteSetting[];
  const get = (key: string) => settings.find(s => s.key === key);
  const text = Object.fromEntries((textResult.data ?? []).map(item => [item.key, item.value])) as Record<string, string>;
  const panels = buildServicePanels({
    services: (serviceResult.data ?? []) as WebsiteService[], text, catalog, settings,
    media: (mediaResult?.data ?? []) as WebsitePackageMedia[],
  });

  return (
    <PoliciesModalProvider>
      <Navbar logoUrl={get('site_logo')?.image_url} />
      <main className="bg-[#FFF9FB] text-zinc-800">
        <HomeHero slides={(heroResult.data ?? []) as HeroSlide[]} logoUrl={get('site_logo')?.image_url} text={text} />
        <HomepageSeo />
        <HomeBeforeAfter photos={galleryPhotos} heading={copy('gallery_heading', text)} subheading={copy('gallery_subheading', text)} />
        <HomeServices panels={panels} heading={copy('services_heading', text)} subheading={copy('services_subheading', text)} />
        <HomeProducts products={(productsResult.data ?? []) as Product[]} heading={copy('products_heading', text)} subheading={copy('products_subheading', text)} />
        <HomeBranches branches={(branchResult.data ?? []) as WebsiteBranch[]} heading={copy('branches_heading', text)} subheading={copy('branches_subheading', text)} />
        <HomeAbout imageUrl={get('about_us_background')?.image_url} heading={copy('about_heading', text)} description={copy('about_description', text)} />
        <HomeFaq items={parseFAQs(text[FAQ_TEXT_KEY])} heading={copy('faq_heading', text)} subheading={copy('faq_subheading', text)} />

        <HomeCta text={text} />
      </main>
      <Footer />
      <PoliciesModal />
    </PoliciesModalProvider>
  );
}
