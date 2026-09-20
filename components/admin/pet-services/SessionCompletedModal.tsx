"use client";
// Shown right after "Complete" succeeds on a Grooming or Boarding
// session card. The card itself disappears from the grid on its own
// (the existing realtime subscription on appointment_pets already
// picks up the status/groomer_id/kennel_id change and refetches) —
// this modal is just the explicit confirmation Josh asked for.
export default function SessionCompletedModal({
  petName,
  onClose,
}: {
  petName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xs bg-white rounded-3xl overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-bold text-zinc-800">Session Completed</h3>
          <p className="mt-1 text-sm text-zinc-500">{petName}&rsquo;s session has been marked complete.</p>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
