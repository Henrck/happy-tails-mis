"use client";
/** Shared feedback for Grooming completion and physical Boarding checkout. */
export default function SessionCompletedModal({ petName, onClose, variant = "grooming" }: {
  petName: string;
  onClose: () => void;
  variant?: "grooming" | "boarding";
}) {
  const boarding = variant === "boarding";
  return <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={boarding ? "Boarding checkout completed" : "Service session completed"} className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-xl">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
      <h3 className="mt-4 text-lg font-bold text-zinc-800">{boarding ? "Pet Checked Out" : "Session Completed"}</h3>
      <p className="mt-2 text-sm text-zinc-600">{boarding
        ? `${petName}'s boarding checkout was saved. The kennel assignment remains in history, and occupancy has been released for this pet.`
        : `${petName}'s session has been marked complete.`}</p>
      <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-brand-pink py-3 text-sm font-bold text-white">OK</button>
    </div>
  </div>;
}
