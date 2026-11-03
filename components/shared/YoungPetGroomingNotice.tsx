"use client";

import { useEffect, useId } from "react";
import { AlertCircle } from "lucide-react";

/** Informational reminder only: pet registration is not an eligibility decision. */
export default function YoungPetGroomingNotice({ onContinue, onCancel }: {
  onContinue: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
      role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-brand-pink">
          <AlertCircle size={26} aria-hidden="true" />
        </div>
        <h2 id={titleId} className="text-xl font-extrabold text-zinc-900">A quick note about young pets</h2>
        <div id={descriptionId} className="mt-3 space-y-3 text-sm leading-6 text-zinc-700">
          <p><strong>About 8–16 weeks</strong> is a common age range for introducing pets to gentle grooming and handling. It is <strong>not a universal minimum age</strong> or a guarantee that professional grooming is appropriate.</p>
          <p>Before arranging a professional grooming session for a puppy or kitten, ask your veterinarian about the pet's health, vaccinations, and readiness. The groomer may need to assess the pet before providing the service.</p>
          <p className="rounded-xl bg-pink-50 p-3 text-xs text-zinc-700">You can still register your pet at any age. This reminder does not block pet registration or approve a grooming booking.</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} autoFocus
            className="min-h-11 rounded-full border border-pink-200 px-4 text-sm font-semibold text-zinc-700 hover:bg-pink-50">Cancel</button>
          <button type="button" onClick={onContinue}
            className="min-h-11 rounded-full bg-brand-pink px-4 text-sm font-bold text-white hover:opacity-90">I understand</button>
        </div>
      </section>
    </div>
  );
}
