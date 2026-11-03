import { createClient } from "@/lib/supabase/client";

export type BookingClosedDate = {
  date: string;
  name: string;
  category: "regular_holiday" | "special_non_working" | "exceptional_closure";
  source: string | null;
  is_open_override: boolean;
};

const CALENDAR_UPDATED = "happytails-booking-calendar-updated";
function publishCalendarChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CALENDAR_UPDATED));
  try { window.localStorage.setItem(CALENDAR_UPDATED, String(Date.now())); } catch { /* optional */ }
}

export async function fetchBookingClosedDates(): Promise<{ dates: BookingClosedDate[]; error: string | null }> {
  const { data, error } = await createClient().from("booking_closed_dates")
    .select("date,name,category,source,is_open_override").order("date");
  return { dates: (data ?? []) as BookingClosedDate[], error: error?.message ?? null };
}

export async function checkBookingClosedDate(date: string): Promise<{ closed: boolean; name: string | null; error: string | null }> {
  const { data, error } = await createClient().from("booking_closed_dates")
    .select("name,is_open_override").eq("date", date).maybeSingle();
  return { closed: Boolean(data && !data.is_open_override), name: data && !data.is_open_override ? data.name : null, error: error?.message ?? null };
}

/**
 * Friendly preflight for Calendar Management. The database trigger is the
 * authoritative protection against concurrent bookings and direct writes.
 * Includes an overnight boarding stay whose check-in is before this date.
 */
async function existingAppointmentConflict(date: string): Promise<string | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Choose a valid calendar date.";
  const db = createClient();
  const [scheduled, boarding] = await Promise.all([
    db.from("appointments").select("id", { count: "exact", head: true })
      .eq("scheduled_date", date).neq("status", "cancelled").neq("status", "completed"),
    db.from("appointments").select("id", { count: "exact", head: true })
      .eq("service_type", "boarding").lt("scheduled_date", date)
      .gte("pick_up_at", `${date}T00:00:00+08:00`)
      .neq("status", "cancelled").neq("status", "completed"),
  ]);
  if (scheduled.error || boarding.error) {
    return `Unable to verify existing appointments for ${date}: ${scheduled.error?.message ?? boarding.error?.message}. No calendar changes were made.`;
  }
  const count = (scheduled.count ?? 0) + (boarding.count ?? 0);
  if (count > 0) {
    return `Cannot close ${date}: ${count} active or upcoming appointment${count === 1 ? "" : "s"} would be affected (including boarding stays). Reschedule or cancel these appointments before marking the shop closed.`;
  }
  return null;
}

export async function addExceptionalClosure(date: string, name: string) {
  const conflict = await existingAppointmentConflict(date);
  if (conflict) return conflict;
  const { error } = await createClient().from("booking_closed_dates")
    .insert({ date, name: name.trim(), category: "exceptional_closure", is_open_override: false });
  if (!error) publishCalendarChange();
  return error?.message ?? null;
}

export async function deleteExceptionalClosure(date: string) {
  const { error } = await createClient().from("booking_closed_dates")
    .delete().eq("date", date).eq("category", "exceptional_closure");
  if (!error) publishCalendarChange();
  return error?.message ?? null;
}

export async function setHolidayOpen(date: string, open: boolean): Promise<string | null> {
  if (!open) {
    const conflict = await existingAppointmentConflict(date);
    if (conflict) return conflict;
  }
  const { error } = await createClient().rpc("happytails_set_holiday_open", { p_date: date, p_open: open });
  if (!error) publishCalendarChange();
  return error?.message ?? null;
}
