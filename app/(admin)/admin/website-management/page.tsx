"use client";
// Website preview: the real homepage sections, rendered from the same data and
// shared builders as the public page. In Edit mode each section gets a button
// that opens the right place to change it.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { type SiteSetting, type SiteSettingKey } from "@/lib/supabase/site-settings";
import EditableSection from "@/components/admin/operations/EditableSection";
import HeroSlidesManager from "@/components/admin/website/HeroSlidesManager";
import BeforeAfterImagesManager from "@/components/admin/website/BeforeAfterImagesManager";
import PetAvatarsManager from "@/components/admin/website/PetAvatarsManager";
import { fetchAllHeroSlides } from "@/lib/supabase/hero-slides";
import type { HeroSlide } from "@/lib/types/hero-slides";
import type { GalleryPhoto } from "@/lib/types/gallery";
import type { Product } from "@/lib/types/products";
import type { WebsiteBranch } from "@/lib/types/website-branches";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HomeHero from "@/components/landing/home/HomeHero";
import HomeBeforeAfter from "@/components/landing/home/HomeBeforeAfter";
import HomeServices from "@/components/landing/home/HomeServices";
import HomeProducts from "@/components/landing/home/HomeProducts";
import HomeBranches from "@/components/landing/home/HomeBranches";
import { HomeAbout, HomeFaq } from "@/components/landing/home/HomeAboutFaq";
import { buildServicePanels, HomeCta } from "@/components/landing/home/homeContent";
import { PoliciesModalProvider } from "@/components/landing/PoliciesModalContext";
import PoliciesModal from "@/components/landing/PoliciesModal";
import { FAQ_TEXT_KEY, parseFAQs } from "@/lib/website/faq";
import { copy, type WebsitePackageMedia, type WebsiteService } from "@/lib/website/catalog";
import type { PublicPricingCatalog } from "@/lib/landing/public-pricing";
import type { Package, PackageInclusion, PackagePricing, PetSize } from "@/lib/types/services";

const CONTENT = "/admin/website-management/content";

export default function WebsiteManagementPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<WebsiteBranch[]>([]);
  const [websiteServices, setWebsiteServices] = useState<WebsiteService[]>([]);
  const [packageMedia, setPackageMedia] = useState<WebsitePackageMedia[]>([]);
  const [websiteText, setWebsiteText] = useState<Record<string, string>>({});
  const [pricingCatalog, setPricingCatalog] = useState<PublicPricingCatalog>({
    packages: [], pricing: [], sizes: [], inclusions: [], loaded: false,
  });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<SiteSettingKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageHeroSlides, setManageHeroSlides] = useState(false);
  const [manageBeforeAfter, setManageBeforeAfter] = useState(false);
  const [managePetAvatars, setManagePetAvatars] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadContent() {
    const supabase = createClient();
    const [settingsResult, productsResult, galleryResult, servicesResult, textResult, branchResult, mediaResult] = await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("products").select("*").eq("status", "active").order("product_code"),
      supabase.from("gallery_photos").select("*").eq("active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("website_services").select("*").eq("published", true).order("sort_order", { ascending: true }),
      supabase.from("website_text").select("key,value"),
      supabase.from("website_branches").select("*").eq("published", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("website_package_media").select("*"),
    ]);
    if (!servicesResult.error) setWebsiteServices((servicesResult.data ?? []) as WebsiteService[]);
    if (!textResult.error) setWebsiteText(Object.fromEntries((textResult.data ?? []).map(row => [row.key, row.value])));
    if (!branchResult.error) setBranches((branchResult.data ?? []) as WebsiteBranch[]);
    if (!mediaResult.error) setPackageMedia((mediaResult.data ?? []) as WebsitePackageMedia[]);
    // The same active Service Management data the public pricing cards use.
    // Never substitute hard-coded prices if a query fails.
    const [packageResult, rateResult, sizeResult, inclusionResult] = await Promise.all([
      supabase.from("packages").select("*").in("service_type", ["dog_grooming", "cat_grooming", "boarding"]).eq("is_active", true),
      supabase.from("package_pricing").select("*"),
      supabase.from("pet_sizes").select("*").in("service_type", ["dog_grooming", "cat_grooming"]),
      supabase.from("package_inclusions").select("*"),
    ]);
    const pricingFailure = packageResult.error ?? rateResult.error ?? sizeResult.error ?? inclusionResult.error;
    setPricingCatalog(pricingFailure
      ? { packages: [], pricing: [], sizes: [], inclusions: [], loaded: false }
      : {
        packages: (packageResult.data ?? []) as Package[],
        pricing: (rateResult.data ?? []) as PackagePricing[],
        sizes: (sizeResult.data ?? []) as PetSize[],
        inclusions: (inclusionResult.data ?? []) as PackageInclusion[],
        loaded: true,
      });
    const failures = [
      pricingFailure ? `Unable to load live pricing: ${pricingFailure.message}` : null,
      settingsResult.error ? `Unable to load website settings: ${settingsResult.error.message}` : null,
      servicesResult.error ? `Unable to load published services: ${servicesResult.error.message}` : null,
      textResult.error ? `Unable to load website text: ${textResult.error.message}` : null,
      branchResult.error ? `Unable to load branches: ${branchResult.error.message}` : null,
    ].filter(Boolean);
    setError(failures.length ? failures.join(" | ") : null);
    if (!settingsResult.error) setSettings((settingsResult.data as SiteSetting[]) ?? []);
    setProducts((productsResult.data as Product[]) ?? []);
    setGalleryPhotos((galleryResult.data as GalleryPhoto[]) ?? []);
    const hero = await fetchAllHeroSlides();
    if (!hero.error) setHeroSlides(hero.slides.filter((s) => s.active));
  }

  useEffect(() => { void loadContent().finally(() => setLoading(false)); }, []);
  const get = (key: SiteSettingKey) => settings.find((s) => s.key === key);
  const panels = buildServicePanels({ services: websiteServices, text: websiteText, catalog: pricingCatalog, media: packageMedia, settings });

  function openUploadFor(key: SiteSettingKey) {
    setUploadTarget(key);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const key = uploadTarget;
    e.target.value = "";
    if (!file || !key) return;
    setUploading(true); setError(null);
    try {
      const supabase = createClient();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => { URL.revokeObjectURL(img.src); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
        img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("The selected file is not a valid image.")); };
        img.src = URL.createObjectURL(file);
      });
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${key}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const newUrl = supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase.from("site_settings").update({ image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height, updated_at: new Date().toISOString() }).eq("key", key);
      if (updateError) throw updateError;
      setSettings((prev) => prev.map((s) => s.key === key ? { ...s, image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height } : s));
    } catch (err) { setError(err instanceof Error ? err.message : "Image upload failed."); }
    finally { setUploading(false); setUploadTarget(null); }
  }

  if (loading) return <p className="text-zinc-400">Loading live preview...</p>;
  const toContent = (group: string) => () => router.push(`${CONTENT}#${group}`);
  return (
    <PoliciesModalProvider>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 flex-1 text-2xl font-bold text-brand-pink sm:text-3xl">Website Management</h1>
          <Link href="/admin/website-management/login" className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-brand-pink bg-white px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-brand-tint">Login Configuration</Link>
          <button type="button" onClick={() => setManagePetAvatars(true)} className="min-h-11 rounded-full border-2 border-brand-pink bg-white px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-brand-tint">Configure Pet Avatars</button>
          <button type="button" onClick={() => setEditMode((v) => !v)} className={`min-h-11 rounded-full border-2 px-5 py-2 text-sm font-semibold ${editMode ? "border-brand-pink bg-brand-pink text-white" : "border-brand-pink text-brand-pink"}`}>{editMode ? "Done Editing" : "Edit"}</button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {uploading && <p className="mt-4 text-sm font-semibold text-brand-pink">Uploading...</p>}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
        <div className="mt-6 max-h-[75dvh] min-w-0 overflow-auto rounded-2xl border-2 border-zinc-800 bg-[#FFF9FB] text-zinc-800 shadow-xl sm:border-4">
          <EditableSection editMode={editMode} label="Logo" onEdit={() => openUploadFor("site_logo")}><Navbar logoUrl={get("site_logo")?.image_url} /></EditableSection>
          <EditableSection editMode={editMode} label="Hero Slides" onEdit={() => setManageHeroSlides(true)} interactive>
            <HomeHero slides={heroSlides} logoUrl={get("site_logo")?.image_url} text={websiteText} />
          </EditableSection>
          {editMode && <EditBar label="Hero text" onClick={toContent("hero")} />}
          <EditableSection editMode={editMode} label="Before & After Photos" onEdit={() => setManageBeforeAfter(true)} interactive>
            <HomeBeforeAfter photos={galleryPhotos} heading={copy("gallery_heading", websiteText)} subheading={copy("gallery_subheading", websiteText)} />
          </EditableSection>
          <EditableSection editMode={editMode} label="Services & Package Photos" onEdit={toContent("service-cards")} interactive>
            <HomeServices panels={panels} heading={copy("services_heading", websiteText)} subheading={copy("services_subheading", websiteText)} />
          </EditableSection>
          <EditableSection editMode={editMode} label="Products Text" onEdit={toContent("products")} interactive>
            <HomeProducts products={products} heading={copy("products_heading", websiteText)} subheading={copy("products_subheading", websiteText)} />
          </EditableSection>
          <EditableSection editMode={editMode} label="Branches" onEdit={() => router.push("/admin/website-management/branches")} interactive>
            {branches.length
              ? <HomeBranches branches={branches} heading={copy("branches_heading", websiteText)} subheading={copy("branches_subheading", websiteText)} />
              : <p className="mx-auto max-w-6xl px-5 py-12 text-center text-sm text-zinc-400">No published branches. This section is hidden on the website.</p>}
          </EditableSection>
          <EditableSection editMode={editMode} label="About Us Photo" onEdit={() => openUploadFor("about_us_background")}>
            <HomeAbout imageUrl={get("about_us_background")?.image_url} heading={copy("about_heading", websiteText)} description={copy("about_description", websiteText)} />
          </EditableSection>
          {editMode && <EditBar label="About Us text" onClick={toContent("about")} />}
          <EditableSection editMode={editMode} label="FAQs" onEdit={() => router.push("/admin/website-management/faqs")} interactive>
            <HomeFaq items={parseFAQs(websiteText[FAQ_TEXT_KEY])} heading={copy("faq_heading", websiteText)} subheading={copy("faq_subheading", websiteText)} />
          </EditableSection>
          <EditableSection editMode={editMode} label="Banner Text" onEdit={toContent("cta")}><HomeCta text={websiteText} /></EditableSection>
          <div className="pointer-events-none" aria-hidden="true"><Footer /></div>
        </div>
        <p className="mt-3 text-xs text-zinc-400">This is the live homepage. Tabs, arrows and FAQs work here; links are turned off. Turn on &quot;Edit&quot; to show an edit button on each section.</p>
        {manageHeroSlides && <HeroSlidesManager onClose={async () => { setManageHeroSlides(false); await loadContent(); }} />}
        {manageBeforeAfter && <BeforeAfterImagesManager onClose={async () => { setManageBeforeAfter(false); await loadContent(); }} />}
        {managePetAvatars && <PetAvatarsManager settings={settings} onChanged={async () => { await loadContent(); }} onClose={() => setManagePetAvatars(false)} />}
        <PoliciesModal />
      </div>
    </PoliciesModalProvider>
  );
}

// A second edit action for sections whose photo and text are edited in different places.
function EditBar({ label, onClick }: { label: string; onClick: () => void }) {
  return <div className="flex justify-end border-y border-dashed border-pink-200 bg-brand-tint/60 px-4 py-2">
    <button type="button" onClick={onClick} className="rounded-full border-2 border-brand-pink bg-white px-4 py-1.5 text-xs font-semibold text-brand-pink hover:bg-brand-pink hover:text-white">Edit {label}</button>
  </div>;
}
