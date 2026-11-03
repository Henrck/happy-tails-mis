"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, X } from "lucide-react";

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

/** Confirmation for transitions that can invalidate a booking draft. */
export default function BookingStepConfirmation({ title, description, confirmLabel, onConfirm, onCancel, danger = false }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="booking-transition-title" aria-describedby="booking-transition-description"
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${danger ? "bg-amber-50 text-amber-700" : "bg-pink-50 text-brand-pink"}`}>
            {danger ? <AlertTriangle size={25} /> : <CheckCircle2 size={25} />}
          </span>
          <button type="button" onClick={onCancel} aria-label="Keep editing" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><X size={19}/></button>
        </div>
        <h2 id="booking-transition-title" className="mt-4 text-lg font-extrabold text-zinc-900">{title}</h2>
        <p id="booking-transition-description" className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" ref={cancelRef} onClick={onCancel} className="flex min-h-12 items-center justify-center rounded-full border-2 border-pink-200 px-4 text-sm font-bold text-brand-pink">Keep Editing</button>
          <button type="button" onClick={onConfirm} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-bold text-white ${danger ? "bg-amber-700 hover:bg-amber-800" : "bg-brand-pink hover:bg-brand-pink-dark"}`}>
            {danger ? <ArrowLeft size={16} /> : <CheckCircle2 size={16} />}{confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
