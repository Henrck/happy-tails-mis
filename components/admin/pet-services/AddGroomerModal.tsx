"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import type { Groomer } from "@/lib/types/pet-services";

export default function AddGroomerModal({ groomers, onClose, onAdd, onArchiveToggle }: {
  groomers: Groomer[];
  onClose: () => void;
  onAdd: (name: string) => Promise<string | null>;
  /** Parent opens the same confirmation dialog used by the Grooming roster. */
  onArchiveToggle: (id: string, currentStatus: "active" | "archived") => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = groomers.filter(g => g.status === "active").length;

  async function add() {
    if (adding || !name.trim()) return;
    setAdding(true); setError(null);
    try {
      const message = await onAdd(name.trim());
      if (message) setError(message);
      else setName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to add groomer."); }
    finally { setAdding(false); }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="presentation"
    onMouseDown={e => { if (e.target === e.currentTarget && !adding) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Manage groomers"
      className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-xl"
      onMouseDown={e => e.stopPropagation()}>
      <header className="flex items-center justify-between bg-brand-pink px-6 py-4 text-white">
        <h2 className="flex items-center gap-2 font-bold"><Users size={18} /> Manage Groomers</h2>
        <button type="button" disabled={adding} onClick={onClose} aria-label="Close groomer management"><X size={20} /></button>
      </header>
      <div className="space-y-4 p-5">
        <p className="rounded-xl bg-pink-50 p-3 text-sm text-zinc-700"><strong>{active} active groomer{active !== 1 ? "s" : ""}</strong>. Only active groomers contribute capacity for new Grooming appointments.</p>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void add(); }}
            placeholder="New groomer name" aria-label="New groomer name" className="min-w-0 flex-1 rounded-xl border border-pink-200 px-3 py-2 text-sm" />
          <button type="button" disabled={adding || !name.trim()} onClick={() => void add()}
            className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{adding ? "Adding…" : "Add"}</button>
        </div>
        {/* Validation stays next to the input, not a second dialog over this dialog. */}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="max-h-72 space-y-2 overflow-y-auto">{groomers.map(g => <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-pink-100 p-3">
          <div className="min-w-0"><p className="break-words text-sm font-semibold">{g.name}</p><p className={`text-xs ${g.status === "active" ? "text-emerald-700" : "text-zinc-500"}`}>{g.status === "active" ? "Active · available for new bookings" : "Archived · no new bookings"}</p></div>
          <button type="button" disabled={adding} onClick={() => onArchiveToggle(g.id, g.status)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${g.status === "active" ? "border-rose-300 text-rose-700" : "border-emerald-300 text-emerald-700"}`}>{g.status === "active" ? "Archive" : "Reactivate"}</button>
        </div>)}</div>
        <p className="text-xs leading-5 text-zinc-500">A confirmation will appear before archiving or reactivating. Existing appointment records are preserved.</p>
      </div>
    </section>
  </div>;
}
