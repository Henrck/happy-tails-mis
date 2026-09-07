// Query + mutation helpers for the homepage hero carousel. The public
// homepage reads slides directly with the server client (same pattern as
// site_settings in app/page.tsx) — these helpers are for the admin Hero
// Slides manager, which runs in the browser.
import { createClient } from "./client";
import type { HeroSlide } from "@/lib/types/hero-slides";

export async function fetchAllHeroSlides() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .select("*")
    .order("sort_order", { ascending: true });
  return { slides: (data ?? []) as HeroSlide[], error: error?.message };
}

export async function uploadHeroSlideImage(file: File) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `hero-slides/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-images")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { url: null, width: null, height: null, error: uploadError.message };

  const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = URL.createObjectURL(file);
  });

  const { data } = supabase.storage.from("site-images").getPublicUrl(path);
  return { url: data.publicUrl, width: dimensions.width, height: dimensions.height, error: null };
}

export async function addHeroSlide(image: { url: string; width: number; height: number }, nextSortOrder: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("hero_slides")
    .insert({ image_url: image.url, image_width: image.width, image_height: image.height, sort_order: nextSortOrder, active: true })
    .select()
    .single();
  return { slide: data as HeroSlide | null, error: error?.message };
}

export async function setHeroSlideActive(id: string, active: boolean) {
  const supabase = createClient();
  const { error } = await supabase.from("hero_slides").update({ active, updated_at: new Date().toISOString() }).eq("id", id);
  return { error: error?.message };
}

export async function deleteHeroSlide(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("hero_slides").delete().eq("id", id);
  return { error: error?.message };
}

// Swaps sort_order between two slides — used by the up/down reorder
// buttons. Two separate awaited updates on purpose (never fire-and-forget
// a mutation): if the second one fails, the caller still knows exactly
// which write succeeded and which didn't, instead of silently drifting
// out of sync with the DB.
export async function swapHeroSlideOrder(a: { id: string; sort_order: number }, b: { id: string; sort_order: number }) {
  const supabase = createClient();
  const { error: errA } = await supabase.from("hero_slides").update({ sort_order: b.sort_order }).eq("id", a.id);
  if (errA) return { error: errA.message };
  const { error: errB } = await supabase.from("hero_slides").update({ sort_order: a.sort_order }).eq("id", b.id);
  if (errB) return { error: errB.message };
  return { error: null };
}
