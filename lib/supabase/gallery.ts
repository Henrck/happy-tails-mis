import { createClient } from "@/lib/supabase/server";
import type { GalleryPhoto } from "@/lib/types/gallery";

export async function fetchActiveGalleryPhotos(): Promise<GalleryPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load gallery photos:", error);
    return [];
  }

  return (data as GalleryPhoto[]) ?? [];
}
