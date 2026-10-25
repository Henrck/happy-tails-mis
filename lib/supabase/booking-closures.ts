import { createClient } from "@/lib/supabase/client";

export type BookingClosedDate = {
  date: string;
  name: string;
  category: "regular_holiday" | "special_non_working" | "exceptional_closure";
  source: string | null;
  is_open_override: boolean;
};

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

export async function addExceptionalClosure(date: string, name: string) {
  const { error } = await createClient().from("booking_closed_dates")
    .insert({ date, name: name.trim(), category: "exceptional_closure", is_open_override: false });
  return error?.message ?? null;
}

export async function deleteExceptionalClosure(date: string) {
  const { error } = await createClient().from("booking_closed_dates")
    .delete().eq("date", date).eq("category", "exceptional_closure");
  return error?.message ?? null;
}

export async function setHolidayOpen(date: string, open: boolean): Promise<string | null> {
  const { error } = await createClient().rpc("happytails_set_holiday_open", { p_date: date, p_open: open });
  return error?.message ?? null;
}
