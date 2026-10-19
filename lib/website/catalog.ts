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
