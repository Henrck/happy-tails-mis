// Same visual as the regular KennelCard, but occupied kennels open the
// session modal on click AND empty kennels get a Remove button — this is
// the "manage" variant used only in Operation Management, not in the
// live Pet Services > Boarding view.
import type { Kennel } from "@/lib/data/boarding-kennels-mock";

const dotColor: Record<string, string> = { checked_in: "bg-red-500", booked: "bg-yellow-400", available: "bg-green-500" };

export default function OpsKennelCard({
  kennel,
  onView,
  onRemove,
}: {
  kennel: Kennel;
  onView: () => void;
  onRemove: () => void;
}) {
  const status = kennel.session?.stage ?? "available";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 relative">
      <span className={`absolute top-4 right-4 w-3 h-3 rounded-full ${dotColor[status]}`} />
      <p className="font-semibold text-zinc-800">Kennel {kennel.number}</p>

      {kennel.session ? (
        <>
          <p className="mt-1.5 text-sm text-zinc-700">{kennel.session.ownerName}</p>
          <p className="text-sm text-zinc-700">{kennel.session.petName}</p>
          <button onClick={onView} className="mt-3 text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1 rounded-full hover:bg-brand-pink hover:text-white transition-colors">
            View
          </button>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-xs text-zinc-400">Available</p>
          <button onClick={onRemove} className="mt-3 text-xs font-semibold border border-red-400 text-red-500 px-4 py-1 rounded-full hover:bg-red-500 hover:text-white transition-colors">
            Remove
          </button>
        </>
      )}
    </div>
  );
}
