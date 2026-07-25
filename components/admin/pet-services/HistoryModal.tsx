"use client";
// History modal: groomers with their completed-session counts, expandable
// to show which pets they were for.
import { useState } from "react";
import type { GroomingSession } from "@/lib/data/grooming-sessions-mock";

export default function HistoryModal({
  completedSessions,
  onClose,
}: {
  completedSessions: GroomingSession[];
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const byGroomer = completedSessions.reduce<Record<string, GroomingSession[]>>((acc, s) => {
    (acc[s.groomerName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Session History</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {Object.keys(byGroomer).length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">No completed sessions yet today.</p>
          ) : (
            Object.entries(byGroomer).map(([groomer, sessions]) => (
              <div key={groomer} className="mb-3">
                <button
                  onClick={() => setExpanded(expanded === groomer ? null : groomer)}
                  className="w-full flex items-center justify-between bg-brand-tint rounded-xl px-4 py-3 text-left"
                >
                  <span className="text-sm font-semibold text-zinc-800">{groomer}</span>
                  <span className="text-xs font-semibold text-brand-pink">
                    {sessions.length} completed
                  </span>
                </button>
                {expanded === groomer && (
                  <ul className="mt-2 ml-2 space-y-1.5">
                    {sessions.map((s) => (
                      <li key={s.id} className="text-sm text-zinc-600 flex justify-between border-b border-pink-50 py-1.5">
                        <span>{s.petName} ({s.ownerName})</span>
                        <span className="text-zinc-400">{s.timeSlot}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
