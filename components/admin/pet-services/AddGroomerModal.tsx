"use client";
// Deliberately separate from AddStaffModal / staff_profiles — groomers
// are just names tied to the grooming service, not login accounts, so
// this doesn't touch the real staff/User Management system at all.
//
// FIXED: onAdd's result was never checked — a failed insert (e.g. the
// RLS-policy error you'd get before 025_groomers_kennels_rls.sql ran)
// would silently do nothing, looking exactly like a broken button. Now
// it's awaited and any error is shown.
import { useState } from "react";
import type { Groomer } from "@/lib/types/pet-services";

export default function AddGroomerModal({
  groomers,
  onClose,
  onAdd,
  onArchiveToggle,
}: {
  groomers: Groomer[];
  onClose: () => void;
  onAdd: (name: string) => Promise<string | null>;
  onArchiveToggle: (id: string, currentStatus: "active" | "archived") => void;
}) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    const err = await onAdd(newName.trim());
    setSaving(false);
    if (err) { setError(err); return; }
    setNewName("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Groomers</h3>
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
              placeholder="New groomer name"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm px-4 rounded-lg transition-colors"
            >
              {saving ? "Adding..." : "Add"}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="mt-5 space-y-2">
            {groomers.map((g) => {
              const archived = g.status === "archived";
              return (
                <div key={g.id} className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${archived ? "bg-zinc-50" : "bg-brand-tint"}`}>
                  <span className={`text-sm font-medium ${archived ? "text-zinc-400 line-through" : "text-zinc-800"}`}>{g.name}</span>
                  <button
                    onClick={() => onArchiveToggle(g.id, g.status)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                      archived ? "border-green-500 text-green-600 hover:bg-green-500 hover:text-white" : "border-red-400 text-red-500 hover:bg-red-500 hover:text-white"
                    }`}
                  >
                    {archived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
