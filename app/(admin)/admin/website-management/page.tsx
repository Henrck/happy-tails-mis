"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type SiteSetting, type SiteSettingKey } from "@/lib/supabase/site-settings";
import EditableSection from "@/components/admin/operations/EditableSection";
import HeroSlidesManager from "@/components/admin/website/HeroSlidesManager";
import ServicesImagesManager from "@/components/admin/website/ServicesImagesManager";
import PricingImagesManager from "@/components/admin/website/PricingImagesManager";
import BeforeAfterImagesManager from "@/components/admin/website/BeforeAfterImagesManager";
import { fetchAllHeroSlides } from "@/lib/supabase/hero-slides";
import type { HeroSlide } from "@/lib/types/hero-slides";
import type { GalleryPhoto } from "@/lib/types/gallery";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
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
import { PoliciesModalProvider } from "@/components/landing/PoliciesModalContext";
import PoliciesModal from "@/components/landing/PoliciesModal";
import type { Product } from "@/lib/types/products";

export default function WebsiteManagementPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<SiteSettingKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageHeroSlides, setManageHeroSlides] = useState(false);
  const [manageServicesImages, setManageServicesImages] = useState(false);
  const [managePricingImages, setManagePricingImages] = useState(false);
  const [manageBeforeAfter, setManageBeforeAfter] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadContent() {
    const supabase = createClient();

    const [{ data: settingsData, error: settingsError }, { data: productsData }, { data: galleryData }] =
      await Promise.all([
        supabase.from("site_settings").select("*"),
        supabase.from("products").select("*").eq("status", "active").order("product_code"),
        supabase
          .from("gallery_photos")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

    if (settingsError) setError(settingsError.message);
    else setSettings((settingsData as SiteSetting[]) ?? []);

    setProducts((productsData as Product[]) ?? []);
    setGalleryPhotos((galleryData as GalleryPhoto[]) ?? []);

    const hero = await fetchAllHeroSlides();
    if (!hero.error) setHeroSlides(hero.slides.filter((s) => s.active));
  }

  useEffect(() => {
    loadContent().finally(() => setLoading(false));
  }, []);

  const get = (key: SiteSettingKey) => settings.find((s) => s.key === key);

  function openUploadFor(key: SiteSettingKey) {
    setUploadTarget(key);
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const key = uploadTarget;
    e.target.value = "";
    if (!file || !key) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error("The selected file is not a valid image."));
        };
        img.src = URL.createObjectURL(file);
      });

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${key}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const newUrl = supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
      const { error: updateError } = await supabase
        .from("site_settings")
        .update({
          image_url: newUrl,
          image_width: dimensions.width,
          image_height: dimensions.height,
          updated_at: new Date().toISOString(),
        })
        .eq("key", key);

      if (updateError) throw updateError;

      setSettings((prev) =>
        prev.map((s) =>
          s.key === key
            ? { ...s, image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploading(false);
      setUploadTarget(null);
    }
  }

  if (loading) return <p className="text-zinc-400">Loading live preview...</p>;

  return (
    <PoliciesModalProvider>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-3xl font-bold text-brand-pink">Website Management</h1>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`rounded-full border-2 px-6 py-2 text-sm font-semibold transition-colors ${
              editMode
                ? "border-brand-pink bg-brand-pink text-white"
                : "border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
            }`}
          >
            {editMode ? "Done Editing" : "Edit"}
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
        {uploading && <p className="mt-4 text-sm font-semibold text-brand-pink">Uploading...</p>}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

        <div className="mt-6 max-h-[75vh] overflow-y-auto overflow-hidden rounded-2xl border-4 border-zinc-800 shadow-xl">
          <EditableSection editMode={editMode} label="Logo" onEdit={() => openUploadFor("site_logo")}>
            <Navbar logoUrl={get("site_logo")?.image_url} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Hero Slides" onEdit={() => setManageHeroSlides(true)}>
            <Hero slides={heroSlides} logoUrl={get("site_logo")?.image_url} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Pet Services Photos" onEdit={() => setManageServicesImages(true)}>
            <Services
              groomingImage={get("services_grooming_image")?.image_url}
              boardingImage={get("services_boarding_image")?.image_url}
              spaImage={get("services_spa_image")?.image_url}
            />
          </EditableSection>

          <EditableSection editMode={editMode} label="Grooming Banner" onEdit={() => openUploadFor("grooming_banner_background")}>
            <GroomingBanner backgroundUrl={get("grooming_banner_background")?.image_url} width={get("grooming_banner_background")?.image_width} height={get("grooming_banner_background")?.image_height} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Grooming Pricing Photos" onEdit={() => setManagePricingImages(true)}>
            <GroomingPricing
              basicImage={get("grooming_basic_image")?.image_url}
              diamondImage={get("grooming_diamond_image")?.image_url}
              premiumImage={get("grooming_premium_image")?.image_url}
            />
          </EditableSection>

          <EditableSection editMode={editMode} label="Boarding Banner" onEdit={() => openUploadFor("boarding_banner_background")}>
            <BoardingBanner backgroundUrl={get("boarding_banner_background")?.image_url} width={get("boarding_banner_background")?.image_width} height={get("boarding_banner_background")?.image_height} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Boarding Pricing Photos" onEdit={() => setManagePricingImages(true)}>
            <BoardingPricing
              smallKennelImage={get("boarding_small_kennel_image")?.image_url}
              bigKennelImage={get("boarding_big_kennel_image")?.image_url}
            />
          </EditableSection>

          <EditableSection editMode={editMode} label="Spa Banner" onEdit={() => openUploadFor("spa_banner_background")}>
            <SpaBanner backgroundUrl={get("spa_banner_background")?.image_url} width={get("spa_banner_background")?.image_width} height={get("spa_banner_background")?.image_height} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Pet Products" onEdit={() => undefined}>
            <ProductsCarousel products={products} />
          </EditableSection>

          <EditableSection editMode={editMode} label="About Us Background" onEdit={() => openUploadFor("about_us_background")}>
            <AboutUs backgroundUrl={get("about_us_background")?.image_url} />
          </EditableSection>

          <EditableSection editMode={editMode} label="Before & After Gallery" onEdit={() => setManageBeforeAfter(true)}>
            <Gallery photos={galleryPhotos} />
          </EditableSection>
        </div>

        <p className="mt-3 text-xs text-zinc-400">
          This is the live site. Toggle "Edit" to reveal edit controls over each section.
        </p>

        {manageHeroSlides && (
          <HeroSlidesManager
            onClose={async () => {
              setManageHeroSlides(false);
              await loadContent();
            }}
          />
        )}

        {manageServicesImages && (
          <ServicesImagesManager
            settings={settings}
            onEdit={(key) => {
              setManageServicesImages(false);
              openUploadFor(key);
            }}
            onClose={() => setManageServicesImages(false)}
          />
        )}

        {managePricingImages && (
          <PricingImagesManager
            settings={settings}
            onEdit={(key) => {
              setManagePricingImages(false);
              openUploadFor(key);
            }}
            onClose={() => setManagePricingImages(false)}
          />
        )}

        {manageBeforeAfter && (
          <BeforeAfterImagesManager
            onClose={async () => {
              setManageBeforeAfter(false);
              await loadContent();
            }}
          />
        )}

        <PoliciesModal />
      </div>
    </PoliciesModalProvider>
  );
}
