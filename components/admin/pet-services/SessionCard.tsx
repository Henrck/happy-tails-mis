import type { GroomingSession } from "@/lib/data/grooming-sessions-mock";

const dotColor: Record<string, string> = {
  in_progress: "bg-red-500",
  scheduled: "bg-yellow-400",
  completed: "bg-green-500",
  cancelled: "bg-zinc-300",
};

export default function SessionCard({
  session,
  onView,
}: {
  session: GroomingSession;
  onView: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 relative">
      <span className={`absolute top-4 right-4 w-3 h-3 rounded-full ${dotColor[session.stage]}`} />
      <div className="flex items-center gap-2 text-sm text-zinc-800 font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500">
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" />
        </svg>
        {session.ownerName}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-sm text-zinc-800 font-medium">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500">
          <path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z" />
        </svg>
        {session.petName}
      </div>
      <button
        onClick={onView}
        className="mt-3 text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
      >
        View
      </button>
    </div>
  );
}
