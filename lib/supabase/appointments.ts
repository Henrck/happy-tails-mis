// Query + mutation helpers for pets and appointments — the real data
// layer behind the walk-in POS flow (and, going forward, Pet's Record,
// which shares the same pets table).
import { createClient } from "./client";
import type { Pet, Species, Sex, Appointment, AppointmentServiceType, DraftPetSelection, GroomingSizeTier } from "@/lib/types/appointments";

// --- Pets ---

export async function fetchPetsByCustomer(customerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("pets").select("*").eq("customer_id", customerId).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}

// Real-time subscription for a customer's own pets — fires on any
// insert/update/delete on the pets table. Filtered to this customer's
// rows only (not every pet in the system) via the postgres_changes
// filter option, since a customer only needs to know about their own
// data changing. Returns an unsubscribe function; the caller MUST call
// it on unmount, same requirement as subscribeToAppointments — leaving
// it out leaks a connection that keeps running after the page is gone.
export function subscribeToCustomerPets(customerId: string, onChange: () => void) {
  const supabase = createClient();
  const channel = supabase
    .channel(`customer-pets-${customerId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pets", filter: `customer_id=eq.${customerId}` },
      onChange
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

export async function fetchAllPets() {
  const supabase = createClient();
  const { data, error } = await supabase.from("pets").select("*").order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}

// Pet's Record splits into two real tabs: pets tied to a registered
// customer account, and walk-in-only pets with no account at all
// (customer_id is null). Both are genuinely real categories in the
// schema already — customer_id was made nullable from the start
// specifically to support walk-ins without accounts.
export async function fetchPetsWithAccounts() {
  const supabase = createClient();
  const { data, error } = await supabase.from("pets").select("*").not("customer_id", "is", null).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}

export async function fetchPetsWithoutAccounts() {
  const supabase = createClient();
  const { data, error } = await supabase.from("pets").select("*").is("customer_id", null).order("name");
  return { pets: (data ?? []) as Pet[], error: error?.message };
}

export async function updatePet(id: string, fields: {
  name: string; species: Species; breed: string; size_label: string; age: number | null; sex: Sex | null;
}) {
  const supabase = createClient();
  return supabase.from("pets").update(fields).eq("id", id);
}

export async function addPet(pet: {
  customer_id: string | null;
  name: string;
  species: Species;
  breed: string;
  size_label: string;
  sex?: Sex | null;
  age?: number | null;
  owner_name?: string | null;
  owner_contact?: string | null;
}) {
  const supabase = createClient();
  return supabase.from("pets").insert(pet).select().single();
}

// --- Customers (search only — customers are created via real signup,
// never inserted here) ---

export async function searchCustomers(query: string) {
  const supabase = createClient();
  const q = query.trim();
  if (!q) return { customers: [], error: null };
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .ilike("full_name", `%${q}%`)
    .eq("status", "active")
    .limit(10);
  return { customers: data ?? [], error: error?.message };
}

// --- Kennel capacity ---
// Agreed rule: small kennel = max 2 small dogs. Big kennel = 1 large,
// OR 1 medium + 1 small, OR 3 small. Checked against pets *already
// assigned to that kennel for overlapping boarding dates* — occupancy
// isn't a stored field, it's derived fresh from real bookings, so it's
// never stale.
//
// Pets are recorded using the real 5-tier grooming size guide (Small /
// Medium / Large / Extra Large / 2X Extra Large — matches pet_sizes),
// not a 3-tier small/medium/large system. Kennel-fit capacity uses a
// coarser 3-category bucket, so kennelFitCategory() maps down from the
// real tier: Small stays Small, Medium stays Medium, and Large/Extra
// Large/2X Extra Large all collapse to "large" for kennel-fit purposes
// (a 30kg dog and a 60kg dog both just need "the big kennel to
// themselves," the exact tier doesn't matter for capacity).
export function kennelFitCategory(sizeLabel: string): "small" | "medium" | "large" {
  const normalized = sizeLabel.trim().toLowerCase();
  if (normalized === "small") return "small";
  if (normalized === "medium") return "medium";
  return "large"; // Large, Extra Large, 2X Extra Large all map here
}

// Converts a raw weight in kg into the real 5-tier size guide, matching
// the exact brackets shown in the dog grooming package design: Small
// (below 5kg), Medium (5-12kg), Large (12-17kg), Extra Large (17-29kg),
// 2X Extra Large (above 29kg). Used when a walk-in customer enters a
// pet's weight directly (the "Size (KG)" field) so it gets stored using
// the same vocabulary as pet_sizes/package pricing, not a raw number
// that nothing else in the system would recognize.
export function weightKgToSizeTier(weightKg: number): GroomingSizeTier {
  if (weightKg < 5) return "Small";
  if (weightKg <= 12) return "Medium";
  if (weightKg <= 17) return "Large";
  if (weightKg <= 29) return "Extra Large";
  return "2X Extra Large";
}

export type KennelOccupant = { size_label: string };

export function canFitInKennel(
  kennelSize: "small" | "big",
  currentOccupants: KennelOccupant[],
  newPetSizeLabel: string
): { fits: boolean; reason?: string } {
  const categories = [...currentOccupants.map((o) => kennelFitCategory(o.size_label)), kennelFitCategory(newPetSizeLabel)];
  const countOf = (cat: "small" | "medium" | "large") => categories.filter((c) => c === cat).length;

  if (kennelSize === "small") {
    // Small kennel: 1 medium alone, or up to 2 small — never a mix, never a large.
    if (countOf("large") > 0) return { fits: false, reason: "Large dogs can't use a small kennel." };
    if (countOf("medium") > 1) return { fits: false, reason: "A small kennel fits only 1 medium dog." };
    if (countOf("medium") === 1 && categories.length > 1) return { fits: false, reason: "A medium dog needs the kennel to itself." };
    if (countOf("small") > 2) return { fits: false, reason: "A small kennel fits at most 2 small dogs." };
    return { fits: true };
  }

  // Big kennel: 1 large alone, OR 1 medium + 1 small, OR up to 3 small.
  if (countOf("large") > 1) return { fits: false, reason: "A big kennel fits only 1 large dog." };
  if (countOf("large") === 1 && categories.length > 1) return { fits: false, reason: "A large dog needs the kennel to itself." };
  if (countOf("medium") > 1) return { fits: false, reason: "A big kennel fits only 1 medium dog." };
  if (countOf("medium") === 1 && countOf("small") > 1) return { fits: false, reason: "A medium dog can share with at most 1 small dog." };
  if (countOf("medium") === 0 && countOf("small") > 3) return { fits: false, reason: "A big kennel fits at most 3 small dogs." };
  return { fits: true };
}

export async function fetchKennelOccupants(kennelId: string, date: string) {
  // Pets already assigned to this kennel for boarding appointments that
  // are active (not cancelled) and overlap the given date.
  const supabase = createClient();
  const { data, error } = await supabase
    .from("appointment_pets")
    .select("pet_id, pets(size_label), appointments!inner(scheduled_date, drop_off_at, pick_up_at, status)")
    .eq("kennel_id", kennelId)
    .neq("appointments.status", "cancelled");
  if (error) return { occupants: [] as KennelOccupant[], error: error.message };

  // Filter to bookings that actually overlap `date` (boarding spans a
  // range via drop_off_at/pick_up_at, not just scheduled_date).
  const targetDate = new Date(date).getTime();
  const relevant = (data ?? []).filter((row: any) => {
    const dropOff = row.appointments?.drop_off_at ? new Date(row.appointments.drop_off_at).getTime() : null;
    const pickUp = row.appointments?.pick_up_at ? new Date(row.appointments.pick_up_at).getTime() : null;
    if (dropOff === null || pickUp === null) return false;
    return targetDate >= dropOff && targetDate <= pickUp;
  });

  return { occupants: relevant.map((row: any) => ({ size_label: row.pets?.size_label ?? "" })), error: null };
}

// --- Groomer scheduling conflict ---
// Agreed rule: same groomer + same customer + same time = blocked (a
// customer can't double-book themselves into the same slot). Same
// groomer + different customers + same time is ALLOWED — the shop
// handles two grooming sessions at once, so this isn't a real conflict.
export async function checkGroomerTimeConflict(
  groomerId: string,
  date: string,
  time: string,
  customerId: string | null,
  ownerContact: string
) {
  const supabase = createClient();
  // groomer_id now lives on appointment_pets, not appointments — join
  // through to find matching bookings.
  const { data, error } = await supabase
    .from("appointment_pets")
    .select("appointments!inner(id, customer_id, owner_contact, scheduled_date, scheduled_time, status)")
    .eq("groomer_id", groomerId);
  if (error) return { conflict: false, error: error.message };

  const conflict = (data ?? []).some((row: any) => {
    const appt = row.appointments;
    if (!appt || appt.status === "cancelled") return false;
    if (appt.scheduled_date !== date || appt.scheduled_time !== time) return false;
    return customerId ? appt.customer_id === customerId : appt.owner_contact === ownerContact;
  });
  return { conflict, error: null };
}

// --- Save a full appointment (the walk-in wizard's final step) ---

export async function createAppointment(params: {
  service_type: AppointmentServiceType;
  customer_id: string | null;
  owner_name: string;
  owner_contact: string;
  owner_address: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  drop_off_at: string | null;
  pick_up_at: string | null;
  special_requests: string | null;
  petSelections: DraftPetSelection[];
}) {
  const supabase = createClient();
  const totalAmount = params.petSelections.reduce((sum, sel) => sum + sel.lineAmount, 0);

  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .insert({
      service_type: params.service_type,
      customer_id: params.customer_id,
      owner_name: params.owner_name,
      owner_contact: params.owner_contact,
      owner_address: params.owner_address,
      is_walk_in: true,
      scheduled_date: params.scheduled_date,
      scheduled_time: params.scheduled_time,
      drop_off_at: params.drop_off_at,
      pick_up_at: params.pick_up_at,
      special_requests: params.special_requests,
      total_amount: totalAmount,
    })
    .select()
    .single();

  if (apptError || !appointment) return { appointment: null, error: apptError?.message ?? "Failed to create appointment." };

  for (const sel of params.petSelections) {
    const { data: apptPet, error: petError } = await supabase
      .from("appointment_pets")
      .insert({
        appointment_id: appointment.id,
        pet_id: sel.pet.id,
        package_id: sel.packageId,
        package_pricing_id: sel.packagePricingId,
        size_id: sel.sizeId,
        kennel_id: sel.kennelId,
        groomer_id: sel.groomerId,
        line_amount: sel.lineAmount,
      })
      .select()
      .single();

    if (petError || !apptPet) return { appointment, error: `Saved appointment, but a pet line failed: ${petError?.message}` };

    if (sel.addonIds.length > 0) {
      const addonRows = sel.addonIds.map((addonId) => ({ appointment_pet_id: apptPet.id, addon_id: addonId, price: 0 }));
      const { error: addonError } = await supabase.from("appointment_addons").insert(addonRows);
      if (addonError) return { appointment, error: `Saved appointment, but add-ons failed to save: ${addonError.message}` };
    }
  }

  return { appointment, error: null };
}
