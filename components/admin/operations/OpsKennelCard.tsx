// Same visual as the regular KennelCard, but every kennel here gets a
// Remove button — this is the "manage" variant used only in Pet Services
// > Boarding management, not a separate live view.
//
// No session data exists yet (no real appointments/bookings table), so
// every kennel is genuinely "available" for now. onView is kept wired
// through (unused until session data exists) rather than removed, so
// wiring in real bookings later doesn't mean touching this file again.
import type { Kennel } from "@/lib/types/pet-services";

export default function OpsKennelCard({
  kennel,
  onView,
  onRemove,
}: {
  kennel: Kennel;
  onView: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 relative">
      <span className="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-500" />
      <p className="font-semibold text-zinc-800">Kennel {kennel.number}</p>
      <p className="mt-1.5 text-xs text-zinc-400">Available</p>
      <button onClick={onRemove} className="mt-3 text-xs font-semibold border border-red-400 text-red-500 px-4 py-1 rounded-full hover:bg-red-500 hover:text-white transition-colors">
        Remove
      </button>
    </div>
  );
}
