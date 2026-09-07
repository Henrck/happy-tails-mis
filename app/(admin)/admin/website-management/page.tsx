"use client";
// Website Management: a REAL live preview of the actual site — not a
// mockup, the literal same Navbar/Hero/banner/AboutUs components the
// public homepage renders — with an Edit toggle that reveals an "Edit"
// button over each editable section. Clicking one opens the upload modal
// scoped to that section's site_settings key.
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { type SiteSetting, type SiteSettingKey } from "@/lib/supabase/site-settings";
import EditableSection from "@/components/admin/operations/EditableSection";
import HeroSlidesManager from "@/components/admin/website/HeroSlidesManager";
import ServicesImagesManager from "@/components/admin/website/ServicesImagesManager";
import { fetchAllHeroSlides } from "@/lib/supabase/hero-slides";
import type { HeroSlide } from "@/lib/types/hero-slides";

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import GroomingBanner from "@/components/landing/GroomingBanner";
import BoardingBanner from "@/components/landing/BoardingBanner";
import SpaBanner from "@/components/landing/SpaBanner";
import AboutUs from "@/components/landing/AboutUs";

export default function WebsiteManagementPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<SiteSettingKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageHeroSlides, setManageHeroSlides] = useState(false);
  const [manageServicesImages, setManageServicesImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadHeroSlides() {
    const { slides, error } = await fetchAllHeroSlides();
    if (!error) setHeroSlides(slides.filter((s) => s.active));
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) setError(error.message);
      else setSettings((data as SiteSetting[]) ?? []);
      await loadHeroSlides();
      setLoading(false);
    }
    load();
  }, []);

  const get = (key: SiteSettingKey) => settings.find((s) => s.key === key);

  function openUploadFor(key: SiteSettingKey) {
    setUploadTarget(key);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const key = uploadTarget;
    e.target.value = ""; // reset so selecting the same file again still fires onChange
    if (!file || !key) return;

    setUploading(true);
    setError(null);
    const supabase = createClient();

    const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = URL.createObjectURL(file);
    });

    const ext = file.name.split(".").pop();
    const path = `${key}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("site-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("site-images").getPublicUrl(path);
    const newUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase
      .from("site_settings")
      .update({ image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (updateError) {
      setError(`Saved the file, but couldn't update the site record: ${updateError.message}`);
      setUploading(false);
      return;
    }

    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, image_url: newUrl, image_width: dimensions.width, image_height: dimensions.height } : s))
    );
    setUploading(false);
    setUploadTarget(null);
  }

  if (loading) {
    return <p className="text-zinc-400">Loading live preview...</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-brand-pink flex-1">Website Management</h1>
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`font-semibold text-sm px-6 py-2 rounded-full border-2 transition-colors ${
            editMode ? "bg-brand-pink border-brand-pink text-white" : "border-brand-pink text-brand-pink hover:bg-brand-pink hover:text-white"
          }`}
        >
          {editMode ? "Done Editing" : "Edit"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2.5">{error}</p>}
      {uploading && <p className="mt-4 text-sm text-brand-pink font-semibold">Uploading...</p>}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />

      {/* The actual live site, rendered for real — not a screenshot or a
          separate mockup. This IS what visitors see. */}
      <div className="mt-6 rounded-2xl overflow-hidden border-4 border-zinc-800 shadow-xl max-h-[75vh] overflow-y-auto">
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
          <GroomingBanner
            backgroundUrl={get("grooming_banner_background")?.image_url}
            width={get("grooming_banner_background")?.image_width}
            height={get("grooming_banner_background")?.image_height}
          />
        </EditableSection>

        <EditableSection editMode={editMode} label="Boarding Banner" onEdit={() => openUploadFor("boarding_banner_background")}>
          <BoardingBanner
            backgroundUrl={get("boarding_banner_background")?.image_url}
            width={get("boarding_banner_background")?.image_width}
            height={get("boarding_banner_background")?.image_height}
          />
        </EditableSection>

        <EditableSection editMode={editMode} label="Spa Banner" onEdit={() => openUploadFor("spa_banner_background")}>
          <SpaBanner
            backgroundUrl={get("spa_banner_background")?.image_url}
            width={get("spa_banner_background")?.image_width}
            height={get("spa_banner_background")?.image_height}
          />
        </EditableSection>

        <EditableSection editMode={editMode} label="About Us Background" onEdit={() => openUploadFor("about_us_background")}>
          <AboutUs backgroundUrl={get("about_us_background")?.image_url} />
        </EditableSection>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        This is the live site. Toggle &quot;Edit&quot; to reveal edit buttons over each section, or &quot;Done Editing&quot; to preview normally.
      </p>

      {manageHeroSlides && (
        <HeroSlidesManager
          onClose={async () => {
            setManageHeroSlides(false);
            await loadHeroSlides(); // refresh the preview with whatever changed
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
    </div>
  );
}
