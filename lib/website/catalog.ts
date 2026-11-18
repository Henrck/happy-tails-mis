export type WebsiteService = { id: string; slug: string; title: string; description: string; image_url: string | null; icon_key: string; sort_order: number; published: boolean; booking_service_type: string | null };
export type WebsitePackageMedia = { package_id: string; image_url: string | null; description: string; published: boolean };
export type WebsitePackage = { id: string; service_type: string; name: string; sort_order: number; is_active: boolean };
export type WebsitePrice = { id: string; package_id: string; size_label: string; price: number; is_per_night: boolean };
export type WebsiteInclusion = { id: string; package_id: string; label: string; sort_order: number };
export type WebsiteCatalog = { services: WebsiteService[]; text: Record<string, string>; packages: WebsitePackage[]; prices: WebsitePrice[]; inclusions: WebsiteInclusion[]; media: WebsitePackageMedia[] };
export const emptyWebsiteCatalog: WebsiteCatalog = { services: [], text: {}, packages: [], prices: [], inclusions: [], media: [] };
export const textDefaults: Record<string,string> = {
 services_heading: 'Our Pet Services', services_subheading: 'Everything your pet needs for a happy, healthy life.',
 gallery_heading: 'Happy Tails, Happy Pets', gallery_subheading: 'A few before-and-afters from our grooming table.',
 grooming_heading: 'Grooming Services', grooming_subheading: 'Care tailored to your pet’s needs. Clean, happy, and ready to shine!',
 boarding_heading: 'Boarding Kennels', boarding_subheading: 'A safe, clean, and comfy home away from home for your furry friend.',
 about_heading: 'About Us', about_description: 'Happy Tails Pet Grooming Cafe is dedicated to providing a safe, caring, and enjoyable environment for pets and their owners. We offer professional pet grooming, comfortable boarding services, and quality pet supplies to ensure every pet receives the best care possible. Our goal is to create a place where pets feel loved and owners can trust that their companions are happy, clean, and well taken care of.',
 grooming_banner_description: 'Because your pet means everything. We provide gentle, stress-free care focused on comfort and happiness.',
 boarding_banner_description: 'A safe and comfortable stay for your pet.', spa_banner_description: 'Natural herbal products, gentle massages, and chemical-free treatments for pet wellness.',
 products_heading: 'Our Products', products_subheading: 'Browse what’s available at our shop — visit us in person to purchase'
};
export function copy(key: string, content: Record<string,string>) { return content[key] ?? textDefaults[key] ?? ''; }

// Text added with the homepage redesign (hero, branches, FAQs, closing banner).
Object.assign(textDefaults, {
 hero_eyebrow: 'Pet Grooming Café · Noveleta, Cavite', hero_heading: 'Fresh, fluffy', hero_highlight: '& happy.',
 hero_description: 'Professional grooming, cozy boarding and a pet shop, caring for your pet like family.',
 branches_heading: 'Our branches', branches_subheading: 'Visit the Happy Tails nearest you. Each branch posts updates on its Facebook page.',
 faq_heading: 'Questions, answered.', faq_subheading: 'Everything you need to know before booking a Happy Tails visit.',
 cta_heading: 'Ready for a fresh look?', cta_description: 'Book grooming or a boarding stay online in a few minutes.',
 highlights_pet_grooming: 'Gentle baths\nTidy trims & styling\nQuality products\nStress-free experience',
 highlights_pet_boarding: 'Cozy & clean spaces\nAttentive staff\nDaily play & care\nSafe & secure',
 highlights_pet_spa: 'Herbal & natural products\nGentle massages\nChemical-free treatments\nRelaxation & well-being',
});

/** Built-in photos used when a service has no image in Website Management. */
export const SERVICE_FALLBACK_IMAGES: Record<string, string> = {
 'pet-grooming': '/images/grooming-banner-bg.png', 'pet-boarding': '/images/boarding-banner-bg.png', 'pet-spa': '/images/spa-banner-bg.png',
};

/** Website text key holding a service's highlight list (one per line). */
export const highlightsKey = (slug: string) => `highlights_${slug.replace(/[^a-z0-9]+/gi, '_')}`;
export function serviceHighlights(slug: string, content: Record<string, string>): string[] {
 return copy(highlightsKey(slug), content).split('\n').map(line => line.trim()).filter(Boolean).slice(0, 8);
}

export type TextField = { key: string; label: string; hint?: string; rows?: number };
/** Homepage text, grouped in the order the sections appear on the page. */
export const TEXT_GROUPS: { id: string; title: string; fields: TextField[] }[] = [
 { id: 'hero', title: 'Hero', fields: [
  { key: 'hero_eyebrow', label: 'Small line above the headline' },
  { key: 'hero_heading', label: 'Headline' },
  { key: 'hero_highlight', label: 'Pink headline ending', hint: 'Shown in pink with an underline, after the headline.' },
  { key: 'hero_description', label: 'Description', rows: 3 },
 ] },
 { id: 'gallery', title: 'Before & after', fields: [
  { key: 'gallery_heading', label: 'Heading' }, { key: 'gallery_subheading', label: 'Subheading', rows: 2 },
 ] },
 { id: 'services', title: 'Services', fields: [
  { key: 'services_heading', label: 'Heading' }, { key: 'services_subheading', label: 'Subheading', rows: 2 },
  { key: 'grooming_banner_description', label: 'Grooming tab: extra description', rows: 3 },
  { key: 'grooming_heading', label: 'Grooming tab: label above the prices' },
  { key: 'boarding_banner_description', label: 'Boarding tab: extra description', rows: 3 },
  { key: 'boarding_heading', label: 'Boarding tab: label above the prices' },
  { key: 'spa_banner_description', label: 'Spa tab: extra description', rows: 3 },
 ] },
 { id: 'products', title: 'Products', fields: [
  { key: 'products_heading', label: 'Heading' }, { key: 'products_subheading', label: 'Subheading', rows: 2 },
 ] },
 { id: 'branches', title: 'Branches', fields: [
  { key: 'branches_heading', label: 'Heading' }, { key: 'branches_subheading', label: 'Subheading', rows: 2 },
 ] },
 { id: 'about', title: 'About Us', fields: [
  { key: 'about_heading', label: 'Heading' }, { key: 'about_description', label: 'Story', rows: 6 },
 ] },
 { id: 'faq', title: 'FAQs', fields: [
  { key: 'faq_heading', label: 'Heading' }, { key: 'faq_subheading', label: 'Subheading', rows: 2 },
 ] },
 { id: 'cta', title: 'Closing banner', fields: [
  { key: 'cta_heading', label: 'Heading' }, { key: 'cta_description', label: 'Description', rows: 2 },
 ] },
];
