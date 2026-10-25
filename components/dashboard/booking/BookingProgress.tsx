"use client";
import { Check } from "lucide-react";
import "./booking-progress-mobile.css";
import { useEffect, useRef } from "react";

export type BookingPhase = "pet-info" | "service" | "waiver" | "selection" | "schedule" | "add-more" | "summary";
const steps = [
  { key: "pet-info", label: "Choose a Pet" },
  { key: "service", label: "Select Service" },
  { key: "waiver", label: "Service Waiver" },
  { key: "selection", label: "Details" },
  { key: "schedule", label: "Schedule" },
  { key: "add-more", label: "More Services" },
  { key: "summary", label: "Review" },
] as const;
export default function BookingProgress({ step, hasCompletedServices, combinedBoarding = false }: {
  step: BookingPhase; hasCompletedServices: boolean; combinedBoarding?: boolean;
}) {
  const shownSteps = combinedBoarding
    ? steps.filter((item) => item.key !== "schedule").map((item) =>
        item.key === "selection" ? { ...item, label: "Boarding Details & Dates" } : item)
    : [...steps];
  const active = shownSteps.findIndex((item) => item.key === step);
  const trackRef = useRef<HTMLOListElement | null>(null);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof window === "undefined" || window.innerWidth > 760) return;
    const target = track.children[active] as HTMLElement | undefined;
    if (!target) return;
    const center = target.offsetLeft - track.offsetLeft + target.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left: Math.max(0, center), behavior: "smooth" });
  }, [active]);
  return <aside className="ht-booking-progress" aria-label="Booking progress">
    <p className="ht-progress-overline">YOUR APPOINTMENT</p>
    <h2>Booking steps</h2>
    <ol ref={trackRef}>{shownSteps.map((item, i) => {
      const completed = i < active || (hasCompletedServices && (item.key === "service" || item.key === "selection" || item.key === "schedule"));
      return <li key={item.key} aria-current={active === i ? "step" : undefined} className={active === i ? "active" : completed ? "completed" : ""}>
        <span className="ht-progress-marker">{completed ? <Check size={14} strokeWidth={3} /> : i + 1}</span><span>{item.label}</span>
      </li>;
    })}</ol>
    <p className="ht-progress-help">You can review all selected services before confirming.</p>
  </aside>;
}
