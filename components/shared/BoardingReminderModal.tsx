"use client";

import { useEffect } from "react";

type Props = { title: string; message: string; details?: string[]; onClose: () => void };

export default function BoardingReminderModal({ title, message, details = [], onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" role="presentation">
    <div role="alertdialog" aria-modal="true" aria-labelledby="boarding-reminder-title" aria-describedby="boarding-reminder-description"
      className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.48 14.14A2 2 0 0 0 3.52 21h16.96a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4m0 4h.01"/></svg>
      </div>
      <h3 id="boarding-reminder-title" className="mt-4 text-center text-lg font-bold text-zinc-900">{title}</h3>
      <p id="boarding-reminder-description" className="mt-2 text-center text-sm leading-6 text-zinc-600">{message}</p>
      {details.length > 0 && <div className="mt-4 space-y-2 rounded-xl bg-amber-50 p-3">{details.map((detail, index) =>
        <p key={index} className="text-sm font-medium text-amber-950">{detail}</p>)}</div>}
      <button type="button" autoFocus onClick={onClose} className="mt-5 w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-semibold text-white hover:opacity-90">Understood</button>
    </div>
  </div>;
}
