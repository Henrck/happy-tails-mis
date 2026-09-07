// Small original stroke-icon set used by the redesigned pricing cards
// (header badges + "Includes" rows) and the new inline Policies card.
// Kept separate from components/landing/Services.tsx's icon set — that
// file already shipped and works, no reason to risk it by merging.

export function PawHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <circle cx="7" cy="8" r="2.1" />
      <circle cx="12" cy="5.5" r="1.8" />
      <circle cx="17" cy="8" r="2.1" />
      <path d="M12 11c-3.2 0-7 2-7 5.2 0 1.5 1.2 2.8 2.8 2.8 1.3 0 1.9-.7 4.2-.7s2.9.7 4.2.7c1.6 0 2.8-1.3 2.8-2.8C19 13 15.2 11 12 11z" />
    </svg>
  );
}
export function DiamondHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l3 5-9 13L3 8l3-5z" />
      <path d="M3 8h18M9 3l-2 5 5 13 5-13-2-5" />
    </svg>
  );
}
export function CrownHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8z" />
      <rect x="5" y="19" width="14" height="2" rx="1" />
    </svg>
  );
}

export function BathDryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13h16v1.5A5.5 5.5 0 0 1 14.5 20h-5A5.5 5.5 0 0 1 4 14.5V13z" />
      <path d="M4 13V8a2 2 0 0 1 3.5-1.3" />
      <circle cx="9" cy="5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="4" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function TrimIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2" />
      <circle cx="6" cy="18" r="2" />
      <path d="M7.6 7.4 20 19M20 5 7.6 16.6" />
    </svg>
  );
}
export function ConditionerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2h4v3l1.5 2.3V21a1 1 0 0 1-1 1H9.5a1 1 0 0 1-1-1V7.3L10 5V2z" />
      <path d="M9.3 11.5h5.4" />
    </svg>
  );
}
export function EarCleanIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15c-3-1.5-4-4-4-6.5A5.5 5.5 0 0 1 10.5 3 5.5 5.5 0 0 1 16 8.5c0 2.5-1.5 3.7-1.5 6a2.5 2.5 0 0 1-5 0" />
      <path d="M9.5 8.5a1.5 1.5 0 0 1 3 0" />
    </svg>
  );
}
export function NailTrimIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l7 7-4.5 4.5L2 7l4-4z" />
      <path d="M13 10l7 7-3 3-7-7" />
    </svg>
  );
}
export function TeethBrushingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l14 2-1 3.5L4 8V4z" />
      <path d="M17 6.5 21 5M17.6 8.7l3.6.6" />
      <path d="M6 9c0 4 1 9 3 9s1.5-3.5 3-3.5S13.5 18 15 18s3-5 3-9" />
    </svg>
  );
}
export function HeartCupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19s-6-3.7-6-8a3.5 3.5 0 0 1 6-2.4A3.5 3.5 0 0 1 18 11c0 4.3-6 8-6 8z" />
    </svg>
  );
}
export function FragranceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 8h6l1 3-2 9H10L8 11l1-3z" />
      <path d="M11 8V5h2v3M9.5 5h5" />
      <path d="M12 2v1.5" />
    </svg>
  );
}

export function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <rect x="9" y="2.5" width="6" height="3" rx="1" />
      <path d="M8.5 11h7M8.5 15h7" />
    </svg>
  );
}
export function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
export function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3z" />
      <path d="M12 10v4M12 17.5v.1" />
    </svg>
  );
}
export function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
export function VaccineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18.5 2 22 5.5l-3 3-3.5-3.5 3-3z" />
      <path d="M16 4l-9.5 9.5 4 4L20 8" />
      <path d="M5 15l-2.5 5L7 17.5" />
      <path d="M9 11l2 2M12 8l2 2" />
    </svg>
  );
}
export function BackpackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 8V6a5 5 0 0 1 10 0v2" />
      <rect x="5" y="8" width="14" height="13" rx="2.5" />
      <path d="M9 8v3h6V8M9 14h6" />
    </svg>
  );
}
