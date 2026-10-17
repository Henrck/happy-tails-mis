"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  description: string;
  confirmLabel?: string;
  pending?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

/** In-app confirmation dialog, independent of browser-native confirm(). */
export default function ActionConfirmModal({ title, description, confirmLabel = "Confirm", pending = false, destructive = false, onCancel, onConfirm }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, pending]);

  return (
    <div role="presentation" className="fixed inset-0 z-[300] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget && !pending) onCancel(); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="action-confirm-title" aria-describedby="action-confirm-description" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id="action-confirm-title" className="text-lg font-bold text-zinc-800">{title}</h2>
        <p id="action-confirm-description" className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button type="button" autoFocus disabled={pending} onClick={onCancel} className="min-h-11 flex-1 rounded-full border-2 border-zinc-200 px-4 py-2 font-semibold text-zinc-600 disabled:opacity-50">Cancel</button>
          <button type="button" disabled={pending} onClick={() => void onConfirm()} className={`min-h-11 flex-1 rounded-full px-4 py-2 font-semibold text-white disabled:opacity-50 ${destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-pink hover:opacity-90"}`}>{pending ? "Please wait…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
