import type { Kennel } from "@/lib/data/boarding-kennels-mock";

const dotColor: Record<string, string> = {
  checked_in: "bg-red-500",
  booked: "bg-yellow-400",
  available: "bg-green-500",
};

export default function KennelCard({
  kennel,
  onView,
}: {
  kennel: Kennel;
  onView: () => void;
}) {
  const status = kennel.session?.stage ?? "available";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 relative">
      <span className={`absolute top-4 right-4 w-3 h-3 rounded-full ${dotColor[status]}`} />
      <p className="font-semibold text-zinc-800">Kennel {kennel.number}</p>

      {kennel.session ? (
        <>
          <div className="mt-1.5 flex items-center gap-2 text-sm text-zinc-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" />
            </svg>
            {kennel.session.ownerName}
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-zinc-500">
              <path d="M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z" />
            </svg>
            {kennel.session.petName}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" strokeLinecap="round" />
            </svg>
            {kennel.session.timeIn}
          </div>
          <button
            onClick={onView}
            className="mt-3 text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
          >
            View
          </button>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-400">Available</p>
      )}
    </div>
  );
}
