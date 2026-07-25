"use client";
import { useState } from "react";
import type { Staff } from "@/lib/data/staff-mock";

export default function AddStaffModal({
  staffList,
  onClose,
  onAdd,
  onArchiveToggle,
}: {
  staffList: Staff[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onArchiveToggle: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Staff</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New staff name"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
            <button
              onClick={() => { if (newName.trim()) { onAdd(newName.trim()); setNewName(""); } }}
              className="bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm px-4 rounded-lg transition-colors"
            >
              Add
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {staffList.map((s) => (
              <div key={s.id} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${s.archived ? "bg-zinc-50" : "bg-brand-tint"}`}>
                <span className={`text-sm font-medium ${s.archived ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{s.name}</span>
                <button
                  onClick={() => onArchiveToggle(s.id)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                    s.archived ? "border-green-500 text-green-600 hover:bg-green-500 hover:text-white" : "border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                  }`}
                >
                  {s.archived ? "Unarchive" : "Archive"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
