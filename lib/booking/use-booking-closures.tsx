"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { checkBookingClosedDate, fetchBookingClosedDates, type BookingClosedDate } from "@/lib/supabase/booking-closures";

/** Fail closed: dates cannot be confirmed while the closure list is unavailable. */
export function useBookingClosures() {
  const [dates, setDates] = useState<BookingClosedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    const result = await fetchBookingClosedDates();
    setDates(result.dates);
    setError(result.error);
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const byDate = useMemo(() => new Map(dates.map(day => [day.date, day.name])), [dates]);
  const nameFor = useCallback((day: string | null | undefined) => day ? byDate.get(day) ?? null : null, [byDate]);
  const verifyOpen = useCallback(async (day: string): Promise<string | null> => {
    if (!day) return "Choose an appointment date.";
    if (loading || error) return `Unable to verify holiday availability. ${error ?? "Please wait and try again."}`;
    const result = await checkBookingClosedDate(day);
    if (result.error) return `Unable to verify holiday availability: ${result.error}`;
    return result.closed ? `${result.name ?? "Holiday / shop closure"} — HappyTails is closed on this date.` : null;
  }, [error, loading]);
  return { dates, loading, error, nameFor, verifyOpen, reload };
}

export function manilaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function manilaTime(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
export function ClosureNotice({ date, name }: { date: string; name: string }) {
  return <p role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{date}: Closed — {name}. Please select another date.</p>;
}
