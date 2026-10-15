import { createClient } from "@/lib/supabase/client";
import type { PetSize } from "@/lib/types/services";
import type { Species } from "@/lib/types/appointments";

export type SizeMatch = { id: string; label: string; weight_range: string };

export async function getActiveSizeGuide(species: Species): Promise<PetSize[]> {
  const supabase = createClient();
  const serviceType = species === "Cat" ? "cat_grooming" : "dog_grooming";
  const { data, error } = await supabase.from("pet_sizes").select("*")
    .eq("service_type", serviceType).eq("is_active", true).order("sort_order");
  if (error) throw new Error(`Unable to load ${species.toLowerCase()} size guide: ${error.message}`);
  return (data ?? []) as PetSize[];
}

// Reads editable Service Management weight ranges, not hardcoded size tiers.
// Supported: "Below 5 kg", "5–12 kg", "12 to 17 kg", "Above 29 kg",
// "> 29 kg", "29 kg and above", "Up to 5 kg", and "5 kg+".
export function weightBounds(input: string): { min: number; max: number; minOpen: boolean; maxOpen: boolean } | null {
  const str = input.toLowerCase().replace(/[–—]/g, "-").replace(/,/g, "").trim();
  const values = [...str.matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
  if (!values.length) return null;
  if (values.length >= 2) return { min: values[0], max: values[1], minOpen: false, maxOpen: false };
  const n = values[0];
  if (/below|under|less than|<\s*\d/.test(str)) return { min: 0, max: n, minOpen: false, maxOpen: !/<=/.test(str) };
  if (/up to|at most|maximum|≤|<=/.test(str)) return { min: 0, max: n, minOpen: false, maxOpen: false };
  if (/above|over|greater than|more than|>\s*\d/.test(str)) return { min: n, max: Infinity, minOpen: !/>=/.test(str), maxOpen: false };
  if (/\+|and above|or above|at least|minimum|≥|>=/.test(str)) return { min: n, max: Infinity, minOpen: false, maxOpen: false };
  return null;
}

export function matchPetSize(weight: number, sizes: PetSize[]): SizeMatch | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  // On shared endpoints (e.g. 5–12 and 12–17), the higher category wins.
  const matching = sizes.map((s) => ({ size: s, bounds: weightBounds(s.weight_range) }))
    .filter((v): v is { size: PetSize; bounds: NonNullable<ReturnType<typeof weightBounds>> } => !!v.bounds)
    .filter(({ bounds }) => (bounds.minOpen ? weight > bounds.min : weight >= bounds.min) && (bounds.maxOpen ? weight < bounds.max : weight <= bounds.max))
    .sort((a, b) => b.bounds.min - a.bounds.min || a.bounds.max - b.bounds.max);
  const size = matching[0]?.size;
  return size ? { id: size.id, label: size.label, weight_range: size.weight_range } : null;
}

export function validatePetInput(form: { name: string; species: Species; breed: string; weight: string; age: string; sex: string }, size: SizeMatch | null) {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Pet name is required.";
  if (!form.species) errors.species = "Species is required.";
  if (!form.breed.trim()) errors.breed = "Breed is required.";
  if (form.weight.trim() && (!Number.isFinite(Number(form.weight)) || Number(form.weight) <= 0)) errors.weight = "Enter a valid weight greater than 0 kg.";
  else if (form.weight.trim() && !size) errors.weight = "Weight is not covered by the active size guide. Please contact staff.";
  if (form.age.trim() && (!Number.isInteger(Number(form.age)) || Number(form.age) < 0 || Number(form.age) > 100)) errors.age = "Enter a valid age in whole years (0–100).";
  if (!form.sex) errors.sex = "Sex is required.";
  return errors;
}

// The customer-specific save path includes the new columns without changing
// existing walk-in or appointment APIs.
export async function insertCustomerPet(input: {
  customer_id: string; name: string; species: Species; breed: string;
  size_label: string; weight_kg: number | null; pet_size_id: string | null;
  age: number | null; sex: "Male" | "Female" | null;
}) {
  return createClient().from("pets").insert(input).select().single();
}
export async function editCustomerPet(id: string, input: {
  name: string; species: Species; breed: string; size_label: string;
  weight_kg: number | null; pet_size_id: string | null; age: number | null; sex: "Male" | "Female" | null;
}) {
  const { data, error } = await createClient().from("pets").update(input).eq("id", id).select();
  if (error) return { data, error };
  if (!data?.length) return { data, error: { message: "Pet update could not be saved. Check your account permissions." } };
  return { data, error: null };
}
