// A pet may hold only one unfinished boarding booking at a time. The same rule
// is enforced in the database by supabase/migrations/20261117_one_active_boarding_per_pet.sql.
import { createClient } from "@/lib/supabase/client";

/** Appointment statuses that still hold a boarding reservation. */
export const ACTIVE_BOARDING_STATUSES = ["pending", "confirmed", "checked_in"] as const;

export type ActiveBoarding = {
  petId: string;
  appointmentId: string;
  appointmentStatus: string;
  dropOffAt: string | null;
  pickUpAt: string | null;
};

type Row = {
  pet_id: string;
  planned_pet_pickup_at: string | null;
  appointments: { id: string; status: string; drop_off_at: string | null; pick_up_at: string | null } | { id: string; status: string; drop_off_at: string | null; pick_up_at: string | null }[] | null;
};

/** Returns the unfinished boarding booking (if any) for each of the given pets.
 * A pet is free again once its booking is cancelled/completed or it is checked out. */
export async function fetchActiveBoardingPets(petIds: string[]): Promise<{ byPet: Record<string, ActiveBoarding>; error: string | null }> {
  if (!petIds.length) return { byPet: {}, error: null };
  const { data, error } = await createClient().from("appointment_pets")
    .select("pet_id,planned_pet_pickup_at,appointments!inner(id,status,drop_off_at,pick_up_at,service_type)")
    .in("pet_id", petIds)
    .eq("appointments.service_type", "boarding")
    .in("appointments.status", [...ACTIVE_BOARDING_STATUSES])
    .is("actual_checkout_at", null)
    .or("status.is.null,status.neq.completed");
  if (error) return { byPet: {}, error: error.message };
  const byPet: Record<string, ActiveBoarding> = {};
  for (const row of (data ?? []) as unknown as Row[]) {
    const booking = Array.isArray(row.appointments) ? row.appointments[0] : row.appointments;
    if (!booking) continue;
    const existing = byPet[row.pet_id];
    const pickUpAt = row.planned_pet_pickup_at ?? booking.pick_up_at;
    // If somehow several exist, show the one that ends last.
    if (existing && (existing.pickUpAt ?? "") >= (pickUpAt ?? "")) continue;
    byPet[row.pet_id] = { petId: row.pet_id, appointmentId: booking.id, appointmentStatus: booking.status, dropOffAt: booking.drop_off_at, pickUpAt };
  }
  return { byPet, error: null };
}

/** Short Manila-time label such as "Nov 20" for a pickup timestamp. */
export function boardingUntilLabel(booking: ActiveBoarding): string | null {
  if (!booking.pickUpAt || !Number.isFinite(Date.parse(booking.pickUpAt))) return null;
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric" }).format(new Date(booking.pickUpAt));
}
