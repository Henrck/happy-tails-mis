// Shows every active groomer, independent of session count — the old
// GroomerGroup only ever rendered for groomers that already had active
// sessions grouped by name, so with zero real sessions (no appointments
// table yet) nothing would show at all. This is what actually answers
// "just display groomers, no sessions yet."
import type { Groomer } from "@/lib/types/pet-services";

export default function GroomerRoster({
  groomers,
  onArchiveToggle,
}: {
  groomers: Groomer[];
  onArchiveToggle: (id: string) => void;
}) {
  if (groomers.length === 0) {
    return <p className="mt-10 text-center text-zinc-400">No groomers yet. Add one to get started.</p>;
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {groomers.map((g) => (
        <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-800">{g.name}</p>
            <p className="text-xs text-zinc-400 mt-0.5">0 active sessions</p>
          </div>
          <button
            onClick={() => onArchiveToggle(g.id)}
            className="text-xs font-semibold border border-red-400 text-red-500 px-3 py-1 rounded-full hover:bg-red-500 hover:text-white transition-colors whitespace-nowrap"
          >
            Archive
          </button>
        </div>
      ))}
    </div>
  );
}
