"use client";

import type { ReactNode, MouseEvent, KeyboardEvent } from "react";
import { useBookingClosures } from "@/lib/booking/use-booking-closures";

/** Keeps the existing live-capacity planner intact while visibly marking and
 * blocking declared holidays. The database still enforces final submission. */
export default function CustomerHolidayCalendarGuard({ children }: { children: ReactNode }) {
  const closures = useBookingClosures();
  const closed = new Set(closures.dates.map(item => item.date));
  const selector = '.ht-customer-holiday-guard section[aria-label="Preferred grooming date calendar"] button[aria-label="';
  const rules = closures.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d.date)).map(d => {
    const base = `${selector}${d.date}"]`;
    return `${base}{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important;pointer-events:none!important;position:relative!important;}` +
      `${base}::after{content:"Closed";display:block;color:#be123c;font-weight:800;font-size:8px;line-height:10px;}`;
  }).join("\n");
  function blockEvent(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('section[aria-label="Preferred grooming date calendar"] button[aria-label]');
    if (button && closed.has(button.getAttribute("aria-label") ?? "")) {
      event.preventDefault(); event.stopPropagation();
    }
  }
  return <div className="ht-customer-holiday-guard" onClickCapture={blockEvent} onKeyDownCapture={event => {
    if (event.key === "Enter" || event.key === " ") blockEvent(event);
  }}>
    <style>{rules}</style>
    {children}
  </div>;
}
