import { createClient } from "@/lib/supabase/client";
import type { KennelSize } from "@/lib/types/pet-services";

export type BoardingDayCapacity = { day: string; total: number; remaining: number };

/** Aggregated occupancy only; guest names and records are never fetched. */
export async function fetchBoardingMonth(month: string, size: KennelSize, nights: number): Promise<{
  days: BoardingDayCapacity[]; error: string | null;
}> {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isSafeInteger(nights) || nights < 1 || nights > 365) {
    return { days: [], error: "Choose a valid boarding duration (1–365 nights)." };
  }
  const { data, error } = await createClient().rpc("happytails_boarding_month_availability", {
    p_first_day: `${month}-01`, p_size: size, p_nights: nights,
  });
  if (error) return { days: [], error: error.message };
  if (!Array.isArray(data)) return { days: [], error: "Kennel availability could not be verified." };
  const days = data.map((row: Record<string, unknown>) => ({
    day: String(row.day ?? ""), total: Number(row.total), remaining: Number(row.remaining),
  }));
  if (days.some((row) => !/^\d{4}-\d{2}-\d{2}$/.test(row.day) || !Number.isSafeInteger(row.total) ||
      !Number.isSafeInteger(row.remaining) || row.remaining < 0 || row.remaining > row.total)) {
    return { days: [], error: "The kennel availability response was invalid." };
  }
  return { days, error: null };
}

export async function checkBoardingStay(day: string, size: KennelSize, nights: number): Promise<{
  total: number; remaining: number; error: string | null;
}> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isSafeInteger(nights) || nights < 1 || nights > 365) {
    return { total: 0, remaining: 0, error: "Choose a valid date and 1–365 night stay." };
  }
  const { data, error } = await createClient().rpc("happytails_boarding_stay_capacity", {
    p_date: day, p_size: size, p_nights: nights,
  });
  if (error) return { total: 0, remaining: 0, error: error.message };
  const row = Array.isArray(data) ? data[0] : null;
  if (!row || !Number.isSafeInteger(Number(row.remaining)) || !Number.isSafeInteger(Number(row.total))) {
    return { total: 0, remaining: 0, error: "Unable to verify kennel availability. Try again." };
  }
  return { total: Number(row.total), remaining: Number(row.remaining), error: null };
}
