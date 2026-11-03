"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkBookingClosedDate, fetchBookingClosedDates, type BookingClosedDate } from "@/lib/supabase/booking-closures";

/** Every booking calendar uses the same store-wide Calendar Management closures.
 * Refresh on focus, tab visibility, a database notification and a low-frequency
 * fallback: realtime may not be enabled for booking_closed_dates in a project.
 */
export function useBookingClosures() {
  const [dates, setDates] = useState<BookingClosedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    // Never leave stale dates looking available when an updated read fails.
    const result = await fetchBookingClosedDates();
    setDates(result.error ? [] : result.dates);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = () => {
      const id = ++generation;
      void fetchBookingClosedDates().then(result => {
        if (!active || id !== generation) return;
        setDates(result.error ? [] : result.dates);
        setError(result.error);
        setLoading(false);
      }).catch(cause => {
        if (!active || id !== generation) return;
        setDates([]);
        setError(cause instanceof Error ? cause.message : "Unable to read store closures.");
        setLoading(false);
      });
    };
    refresh();
    const onFocus = () => refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "happytails-booking-calendar-updated") refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("happytails-booking-calendar-updated", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    const db = createClient();
    const channel = db.channel("happytails-store-closure-calendar")
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_closed_dates" }, refresh)
      .subscribe();
    return () => {
      active = false;
      ++generation;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("happytails-booking-calendar-updated", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      void db.removeChannel(channel);
    };
  }, []);

  const byDate = useMemo(() => new Map(dates.filter(day => !day.is_open_override).map(day => [day.date, day.name])), [dates]);
  const nameFor = useCallback((day: string | null | undefined) => day ? byDate.get(day) ?? null : null, [byDate]);
  const verifyOpen = useCallback(async (day: string): Promise<string | null> => {
    if (!day) return "Choose an appointment date.";
    if (loading || error) return `Unable to verify store calendar availability. ${error ?? "Please try again."}`;
    const result = await checkBookingClosedDate(day);
    if (result.error) return `Unable to verify store calendar availability: ${result.error}`;
    return result.closed ? `${result.name ?? "Shop closure"} — HappyTails is closed on this date.` : null;
  }, [error, loading]);
  return { dates, loading, error, nameFor, verifyOpen, reload };
}

export function manilaToday(): string {
  const pieces = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => pieces.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function manilaTime(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
export function ClosureNotice({ date, name }: { date: string; name: string }) {
  return <p role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{date}: Closed — {name}. Please select another date.</p>;
}
