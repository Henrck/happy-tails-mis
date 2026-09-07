// Cute face-style dog/cat icons (rounded head, ear shapes, dot eyes),
// matching Josh's reference image, instead of the previous abstract
// silhouette style — meant to be instantly recognizable at small sizes.
import type { Species } from "@/lib/types/appointments";

export default function SpeciesIcon({ species, className }: { species: Species; className?: string }) {
  if (species === "Cat") {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* head */}
        <circle cx="50" cy="55" r="32" fill="currentColor" />
        {/* pointed ears */}
        <path d="M25 35L15 12l25 15z" fill="currentColor" />
        <path d="M75 35l10-23-25 15z" fill="currentColor" />
        {/* inner ears */}
        <path d="M26 30l-5-11 13 8z" fill="white" />
        <path d="M74 30l5-11-13 8z" fill="white" />
        {/* face patch */}
        <ellipse cx="50" cy="62" rx="20" ry="15" fill="white" />
        {/* eyes */}
        <circle cx="41" cy="52" r="3.5" fill="white" />
        <circle cx="59" cy="52" r="3.5" fill="white" />
        {/* nose + mouth */}
        <path d="M50 60l-3 3h6z" fill="currentColor" />
        <path d="M50 63v3M50 66q-4 4-8 1M50 66q4 4 8 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* whiskers */}
        <path d="M18 58h12M18 65h12M70 58h12M70 65h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      {/* floppy ears */}
      <ellipse cx="20" cy="42" rx="14" ry="20" fill="currentColor" transform="rotate(-20 20 42)" />
      <ellipse cx="80" cy="42" rx="14" ry="20" fill="currentColor" transform="rotate(20 80 42)" />
      {/* head */}
      <circle cx="50" cy="55" r="32" fill="currentColor" />
      {/* face patch */}
      <ellipse cx="50" cy="62" rx="20" ry="16" fill="white" />
      {/* eyes */}
      <circle cx="40" cy="50" r="3.5" fill="white" />
      <circle cx="60" cy="50" r="3.5" fill="white" />
      {/* nose */}
      <ellipse cx="50" cy="60" rx="5" ry="3.5" fill="currentColor" />
      {/* mouth + tongue */}
      <path d="M50 63.5v3q-5 4-9 1M50 66.5q5 4 9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M47 68q3 6 6 0" fill="#F9A8B4" />
    </svg>
  );
}
