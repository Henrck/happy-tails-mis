"use client";
import { useState } from "react";
import type { Kennel, KennelSize } from "@/lib/types/pet-services";
import { kennelDisplayName } from "@/lib/types/pet-services";
export default function AddKennelModal({ nextNumber, inactive, onClose, onAdd, onReactivate, saving }: {
  nextNumber: (size: KennelSize) => number;
  inactive: Kennel[];
  onClose: () => void;
  onAdd: (size: KennelSize, number: number, name: string) => void;
  onReactivate: (id: string) => void;
  saving: boolean;
}) {
  const [size, setSize] = useState<KennelSize>("small");
  const [mode, setMode] = useState<"reactivate" | "new">("reactivate");
  const [oldId, setOldId] = useState("");
  const [name, setName] = useState("");
  const matching = inactive.filter(k => k.size === size);
  const selected = matching.find(k => k.id === oldId) ?? matching[0];
  const reactivating = mode === "reactivate" && !!selected;
  const number = nextNumber(size);
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Add kennel" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
      <h2 className="text-xl font-bold text-brand-pink">Manage Kennels</h2>
      <p className="mt-2 text-sm text-zinc-500">Reactivate a disabled kennel to retain its number, or register a new physical kennel.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">{(["small", "big"] as KennelSize[]).map(s => <button type="button" key={s} onClick={() => { setSize(s); setOldId(""); }} className={`rounded-xl border-2 py-3 text-sm font-bold ${size === s ? "border-brand-pink bg-pink-50 text-brand-pink" : "border-zinc-200"}`}>{s === "big" ? "Big" : "Small"}</button>)}</div>
      {matching.length > 0 && <label className="mt-4 flex items-center gap-2 text-sm"><input type="radio" checked={mode === "reactivate"} onChange={() => setMode("reactivate")}/> Reactivate disabled kennel</label>}
      {reactivating && <select value={selected.id} onChange={e => setOldId(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm">{matching.map(k => <option key={k.id} value={k.id}>{kennelDisplayName(k)} · #{k.number}</option>)}</select>}
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="radio" checked={!reactivating} onChange={() => setMode("new")}/> Add a new kennel</label>
      {!reactivating && <div className="mt-3 rounded-xl bg-zinc-50 p-4"><p className="text-sm font-semibold">Permanent number: #{number}</p><label className="mt-3 block text-sm font-medium">Display name<input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder={`Kennel ${number}`} className="mt-1 w-full rounded-xl border bg-white p-3"/></label></div>}
      {reactivating && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Keeps the original kennel number and past appointment links.</p>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button disabled={saving} onClick={onClose} className="rounded-full border py-3">Cancel</button><button disabled={saving} onClick={() => reactivating ? onReactivate(selected.id) : onAdd(size, number, name.trim() || `Kennel ${number}`)} className="rounded-full bg-brand-pink py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : reactivating ? "Reactivate" : "Add Kennel"}</button></div>
    </div>
  </div>;
}
