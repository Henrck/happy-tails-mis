"use client";

import { useEffect, useId, useRef } from "react";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";

type Tone = "error" | "warning" | "info";

type Props = {
  title: string;
  message: string;
  tone?: Tone;
  onClose: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionPending?: boolean;
};

/** Important, actionable feedback only. Leave routine form hints inline. */
export default function FeedbackDialog({
  title, message, tone = "error", onClose,
  actionLabel = "Understood", onAction, actionPending = false,
}: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !actionPending) { e.stopPropagation(); onClose(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, actionPending]);

  const Icon = tone === "warning" ? AlertTriangle : tone === "info" ? Info : AlertCircle;
  const color = tone === "warning" ? "bg-amber-50 text-amber-700" : tone === "info" ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-600";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-black/65 p-3 sm:p-5"
      role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !actionPending) onClose(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <button type="button" disabled={actionPending} onClick={onClose} aria-label="Dismiss message"
            className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50"><X size={19} /></button>
        </div>
        <h2 id={titleId} className="mt-4 text-lg font-extrabold text-zinc-900 sm:text-xl">{title}</h2>
        <p id={descriptionId} className="mt-2 max-h-[45vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-6 text-zinc-600">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {onAction && <button type="button" disabled={actionPending} onClick={onAction}
            className="min-h-11 rounded-full border-2 border-pink-200 px-5 text-sm font-semibold text-brand-pink disabled:opacity-50">{actionLabel}</button>}
          <button type="button" ref={closeRef} disabled={actionPending} onClick={onClose}
            className="min-h-11 rounded-full bg-brand-pink px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">Close</button>
        </div>
      </section>
    </div>
  );
}
