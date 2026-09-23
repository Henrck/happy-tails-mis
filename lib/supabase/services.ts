// Query + mutation helpers for Service Management. All reads/writes go
// straight to the real tables from 006/007/008 — no mock data here.
import { createClient } from "./client";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, AddonCategory, Addon, AddonPrice } from "@/lib/types/services";

export async function fetchPackagesFull(serviceType: ServiceType) {
  const supabase = createClient();
  const { data: packages, error: pErr } = await supabase
    .from("packages")
    .select("*")
    .eq("service_type", serviceType)
    .order("sort_order");
  if (pErr || !packages) return { packages: [] as Package[], inclusions: [] as PackageInclusion[], pricing: [] as PackagePricing[], error: pErr?.message };

  const packageIds = packages.map((p) => p.id);
  const [{ data: inclusions }, { data: pricing }] = await Promise.all([
    supabase.from("package_inclusions").select("*").in("package_id", packageIds).order("sort_order"),
    // .order("id") here isn't cosmetic — without it Postgres doesn't
    // guarantee row order across repeated identical queries, and this
    // gets re-fetched every time BoardingSelectionStep mounts (e.g.
    // every time the customer clicks Back into it). An unstable order
    // meant the duration-rate buttons could visibly reshuffle each time
    // — that's the "buttons glitching on back" bug.
    supabase.from("package_pricing").select("*").in("package_id", packageIds).order("id"),
  ]);

  return {
    packages: packages as Package[],
    inclusions: (inclusions ?? []) as PackageInclusion[],
    pricing: (pricing ?? []) as PackagePricing[],
    error: null,
  };
}

export async function fetchPetSizes(serviceType: ServiceType) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pet_sizes")
    .select("*")
    .eq("service_type", serviceType)
    .order("sort_order");
  return { sizes: (data ?? []) as PetSize[], error: error?.message };
}

export async function fetchAddonsByCategory(categoryName: string) {
  const supabase = createClient();
  const { data: category } = await supabase.from("addon_categories").select("*").eq("name", categoryName).single();
  if (!category) return { addons: [] as Addon[], prices: [] as AddonPrice[], error: "Category not found" };

  const { data: addons } = await supabase.from("addons").select("*").eq("category_id", category.id).order("sort_order");
  const addonIds = (addons ?? []).map((a) => a.id);
  const { data: prices } = addonIds.length
    ? await supabase.from("addon_prices").select("*").in("addon_id", addonIds).order("id")
    : { data: [] };

  return { addons: (addons ?? []) as Addon[], prices: (prices ?? []) as AddonPrice[], error: null };
}

// --- Mutations ---

export async function togglePackageActive(id: string, isActive: boolean) {
  const supabase = createClient();
  return supabase.from("packages").update({ is_active: isActive }).eq("id", id);
}

export async function toggleSizeActive(id: string, isActive: boolean) {
  const supabase = createClient();
  return supabase.from("pet_sizes").update({ is_active: isActive }).eq("id", id);
}

export async function toggleAddonActive(id: string, isActive: boolean) {
  const supabase = createClient();
  return supabase.from("addons").update({ is_active: isActive }).eq("id", id);
}
