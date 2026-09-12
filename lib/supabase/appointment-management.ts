// Real Appointment Management data layer. A "row" here represents one
// whole appointment (which may have multiple pets, per the walk-in
// flow's multi-pet support) — not one row per pet, unlike the old mock.
// Pet names/breeds are joined and shown together on one row; opening
// the detail modal shows the full per-pet breakdown.
//
// FIXED a real gap: the query never selected package/kennel/add-on
// info at all, so the detail modal had nothing to show for "what
// service was actually booked" beyond the service_type label — Package,
// Size, Kennel, and Add-ons were structurally missing, not just hidden.
import { createClient } from "./client";
import type { Appointment, AppointmentStatus } from "@/lib/types/appointments";

export type AppointmentPetDetail = {
  id: string; // pet id
  name: string;
  breed: string;
  size_label: string;
  groomerId: string | null;
  groomerName: string | null;
  packageName: string | null; // grooming/ala carte packages; null for boarding or Ala Carte (no package)
  packagePricingLabel: string | null; // boarding's duration/rate tier, e.g. "3 Days & 2 Nights"
  kennelLabel: string | null; // e.g. "Small #101"
  addonNames: string[];
  lineAmount: number;
};

export type AppointmentRow = Appointment & {
  pets: AppointmentPetDetail[];
  groomerNames: string[];
};

// Shape of one row as it actually comes back from the joined select()
// below — typed so the mapping code doesn't need `any`.
type RawAppointmentPetJoin = {
  id: string;
  pet_id: string;
  groomer_id: string | null;
  line_amount: number | null;
  pets: { id: string; name: string; breed: string; size_label: string } | null;
  groomers: { id: string; name: string } | null;
  packages: { id: string; name: string } | null;
  package_pricing: { id: string; size_label: string; size_detail: string | null } | null;
  kennels: { id: string; size: string; number: number } | null;
  appointment_addons: { addons: { name: string } | null }[] | null;
};
type RawAppointmentJoin = Appointment & { appointment_pets: RawAppointmentPetJoin[] | null };

// Selects appointments joined all the way down to what was actually
// booked per pet — package, size, kennel, groomer, and add-ons — not
// just pet identity. This is the real fix for the missing service
// info: the data genuinely wasn't being fetched before, so no amount
// of UI work in the modal could have shown it.
async function fetchAppointmentsRaw(customerId?: string) {
  const supabase = createClient();
  let query = supabase
    .from("appointments")
    .select(`
      *,
      appointment_pets (
        id,
        pet_id,
        groomer_id,
        line_amount,
        pets ( id, name, breed, size_label ),
        groomers ( id, name ),
        packages ( id, name ),
        package_pricing ( id, size_label, size_detail ),
        kennels ( id, size, number ),
        appointment_addons ( addons ( name ) )
      )
    `)
    .order("scheduled_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (customerId) query = query.eq("customer_id", customerId);

  const { data, error } = await query;

  if (error) return { rows: [] as AppointmentRow[], error: error.message };

  const rows: AppointmentRow[] = ((data ?? []) as RawAppointmentJoin[]).map((appt) => {
    const apPets = appt.appointment_pets ?? [];
    const pets: AppointmentPetDetail[] = apPets.map((ap: RawAppointmentPetJoin) => ({
      id: ap.pets?.id ?? "",
      name: ap.pets?.name ?? "—",
      breed: ap.pets?.breed ?? "—",
      size_label: ap.pets?.size_label ?? "—",
      groomerId: ap.groomer_id,
      groomerName: ap.groomers?.name ?? null,
      packageName: ap.packages?.name ?? null,
      packagePricingLabel: ap.package_pricing
        ? (ap.package_pricing.size_detail ?? ap.package_pricing.size_label)
        : null,
      kennelLabel: ap.kennels ? `${ap.kennels.size === "small" ? "Small" : "Big"} #${ap.kennels.number}` : null,
      addonNames: (ap.appointment_addons ?? []).map((aa) => aa.addons?.name).filter((n): n is string => Boolean(n)),
      lineAmount: ap.line_amount ?? 0,
    }));

    return {
      ...appt,
      pets,
      groomerNames: Array.from(new Set(pets.map((p) => p.groomerName).filter(Boolean))) as string[],
    };
  });

  return { rows, error: null };
}

export async function fetchAppointments() {
  return fetchAppointmentsRaw();
}

// Same query, scoped to one customer's own bookings — powers
// /account/appointments/history.
export async function fetchAppointmentsByCustomer(customerId: string) {
  return fetchAppointmentsRaw(customerId);
}

export async function fetchTodaysAppointmentCount() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("scheduled_date", today)
    .neq("status", "cancelled");
  return { count: count ?? 0, error: error?.message };
}

export async function fetchTodaysTransactionTotal() {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("appointments")
    .select("total_amount")
    .eq("scheduled_date", today)
    .neq("status", "cancelled");
  const total = (data ?? []).reduce((sum, row) => sum + (row.total_amount ?? 0), 0);
  return { total, error: error?.message };
}

// Strict forward-only status progression: pending -> confirmed ->
// checked_in -> completed. cancelled is reachable from any
// non-completed state (cancelling doesn't need to follow the sequence
// — a booking can be called off at any point before it's done). This
// function is the single real source of truth for "what's the only
// valid next status" — both the button-enabling logic in the modal AND
// this guard check the same rule, so the UI can't offer something the
// backend would reject, and the backend never trusts the UI alone.
const STATUS_ORDER: AppointmentStatus[] = ["pending", "confirmed", "checked_in", "completed"];

export function nextValidStatus(current: AppointmentStatus): AppointmentStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  if (idx === -1 || idx === STATUS_ORDER.length - 1) return null; // completed or cancelled has no next step
  return STATUS_ORDER[idx + 1];
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  const supabase = createClient();
  const { data, error } = await supabase.from("appointments").update({ status }).eq("id", id).select().single();
  return { data, error };
}

// Real-time subscription: fires the callback whenever any appointment
// row (or its pets/addons) changes — insert, update, or delete. This is
// what makes the page update live without a refresh when a walk-in gets
// booked in another tab. Returns an unsubscribe function; the caller
// MUST call it on unmount, or the subscription leaks and keeps running
// after the page is gone.
//
// Channel name includes a random suffix: this now has two real
// consumers (Appointment Management on the admin side, and a
// customer's own Appointment History), and if both happen to be open
// at once, two channels sharing one fixed topic name would hit the
// same "cannot add postgres_changes callbacks after subscribe()" error
// already fixed once in notifications.ts.
export function subscribeToAppointments(onChange: () => void) {
  const supabase = createClient();
  const uniqueSuffix = Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(`appointments-realtime-${uniqueSuffix}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "appointment_pets" }, onChange)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
