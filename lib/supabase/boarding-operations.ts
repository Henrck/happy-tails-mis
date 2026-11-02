import { createClient } from "@/lib/supabase/client";
import type { BoardingSessionRow } from "@/lib/supabase/service-sessions";

export type BoardingHistoryItem = {
  appointmentPetId: string;
  petName: string;
  ownerName: string;
  kennelLabel: string;
  dropOffAt: string | null;
  pickUpAt: string | null;
  amount: number;
  actualCheckoutAt: string | null;
  plannedPetPickupAt: string | null;
};

/** Staff can shorten an individual pet's planned stay, never lengthen the booked
 * shared-kennel reservation. Adjusting a planned pickup does not issue a refund. */
export async function setBoardingPetPlannedPickup(appointmentPetId: string, pickupAt: string): Promise<{ error: string | null }> {
  if (!Number.isFinite(Date.parse(pickupAt))) return { error: "Choose a valid pickup date and time." };
  const { error } = await createClient().rpc("happytails_set_boarding_pet_pickup", {
    p_appointment_pet_id: appointmentPetId,
    p_pickup_at: pickupAt,
  });
  return { error: error?.message ?? null };
}

export async function confirmBoardingArrival(appointmentId: string): Promise<{ error: string | null }> {
  const { error } = await createClient().rpc("happytails_boarding_checkin", {
    p_appointment_id: appointmentId,
  });
  return { error: error?.message ?? null };
}

/** One staff-confirmed checkout closes occupancy but retains the kennel ID for history. */
export async function checkoutBoardingPet(appointmentPetId: string): Promise<{ error: string | null }> {
  const db = createClient();
  const { error } = await db.rpc("happytails_checkout_boarding_pet", {
    p_appointment_pet_id: appointmentPetId,
  });
  if (error) return { error: error.message };
  // A successful RPC is not the same as proof of the persisted transition.
  // Never show a success modal while the row still occupies a kennel.
  const { data, error: readError } = await db.from("appointment_pets")
    .select("status,actual_checkout_at").eq("id", appointmentPetId).single();
  if (readError) return { error: `Checkout was submitted, but verification failed: ${readError.message}. Refresh before trying again.` };
  if (data?.status !== "completed" || !data.actual_checkout_at) {
    return { error: "Checkout could not be verified. Refresh Boarding Management before trying again." };
  }
  return { error: null };
}

/** Physically present pets only. Confirmed future reservations are not occupancy. */
export async function fetchBoardingOccupancy(): Promise<{
  sessions: BoardingSessionRow[];
  error: string | null;
}> {
  const { data, error } = await createClient().from("appointment_pets").select(`
    id,pet_id,kennel_id,status,planned_pet_pickup_at,
    appointments!inner(id,owner_name,drop_off_at,pick_up_at,status,service_type),
    pets(id,name,breed),kennels(id,size,number)
  `).not("kennel_id", "is", null).eq("appointments.status", "checked_in")
    .eq("appointments.service_type", "boarding").neq("status", "completed");
  if (error) return { sessions: [], error: error.message };
  const rows = (data ?? []) as unknown as Array<{
    id: string;pet_id: string;kennel_id: string;
    appointments: { id: string; owner_name: string;drop_off_at: string | null;pick_up_at: string | null };
    planned_pet_pickup_at: string | null;
    pets: { id: string;name: string;breed: string } | null;
    kennels: { id: string;size: "small" | "big";number: number } | null;
  }>;
  return { sessions: rows.map((row) => ({
    appointmentId: row.appointments.id,
    appointmentPetId: row.id,
    petId: row.pets?.id ?? row.pet_id,
    petName: row.pets?.name ?? "Unknown pet",
    breed: row.pets?.breed ?? "—",
    ownerName: row.appointments.owner_name,
    dropOffAt: row.appointments.drop_off_at,
    pickUpAt: row.planned_pet_pickup_at ?? row.appointments.pick_up_at,
    kennelId: row.kennels?.id ?? row.kennel_id,
    kennelSize: row.kennels?.size ?? "small",
    kennelNumber: row.kennels?.number ?? 0,
    stage: "checked_in" as const,
  })), error: null };
}

/** Recent completed pets; the kennel assignment remains available for audit. */
export async function fetchBoardingHistory(): Promise<{ history: BoardingHistoryItem[];error: string | null }> {
  const { data, error } = await createClient().from("appointment_pets").select(`
    id,kennel_id,line_amount,status,actual_checkout_at,planned_pet_pickup_at,
    appointments!inner(owner_name,drop_off_at,pick_up_at,service_type),
    pets(name),kennels(size,number)
  `).eq("status", "completed").eq("appointments.service_type", "boarding").limit(100);
  if (error) return { history: [], error: error.message };
  const rows = (data ?? []) as unknown as Array<{
    id: string;line_amount: number | null;actual_checkout_at: string | null;planned_pet_pickup_at: string | null;
    appointments: { owner_name: string;drop_off_at: string | null;pick_up_at: string | null };
    pets: { name: string } | null;
    kennels: { size: string;number: number } | null;
  }>;
  return { history: rows.map((row) => ({
    appointmentPetId: row.id,
    petName: row.pets?.name ?? "Unknown pet",
    ownerName: row.appointments.owner_name,
    kennelLabel: row.kennels ? `${row.kennels.size === "big" ? "Big" : "Small"} #${row.kennels.number}` : "Historical kennel unavailable",
    dropOffAt: row.appointments.drop_off_at,
    pickUpAt: row.planned_pet_pickup_at ?? row.appointments.pick_up_at,
    amount: row.line_amount ?? 0,
    actualCheckoutAt: row.actual_checkout_at,
    plannedPetPickupAt: row.planned_pet_pickup_at,
  })), error: null };
}
