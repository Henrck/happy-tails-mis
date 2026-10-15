"use client";
import { Check } from "lucide-react";
export type BookingPhase = "pet-info" | "service" | "selection" | "schedule" | "add-more" | "summary";
const steps = [
  { key: "pet-info", label: "Choose a Pet" },
  { key: "service", label: "Select Service" },
  { key: "selection", label: "Packages" },
  { key: "schedule", label: "Schedule" },
  { key: "add-more", label: "More Services" },
  { key: "summary", label: "Review" },
] as const;
export default function BookingProgress({ step, hasCompletedServices }: {step: BookingPhase; hasCompletedServices: boolean}) {
  const active = steps.findIndex((x) => x.key === step);
  return <aside className="ht-booking-progress" aria-label="Booking progress">
    <p className="ht-progress-overline">YOUR APPOINTMENT</p>
    <h2>Booking steps</h2>
    <ol>{steps.map((item, i) => {
      const completed = i < active || (hasCompletedServices && (item.key === "service" || item.key === "selection" || item.key === "schedule"));
      return <li key={item.key} aria-current={active === i ? "step" : undefined} className={active === i ? "active" : completed ? "completed" : ""}>
        <span className="ht-progress-marker">{completed ? <Check size={14} strokeWidth={3} /> : i + 1}</span><span>{item.label}</span>
      </li>;
    })}</ol>
    <p className="ht-progress-help">You can review all selected services before confirming.</p>
  </aside>;
}
