"use client";
// Appointment detail modal, real version. Loops over pets since a real
// appointment can have more than one — the mock version assumed exactly
// one pet per appointment throughout, which no longer holds.
import { useState } from "react";
import type { AppointmentRow } from "@/lib/supabase/appointment-management";
import { nextValidStatus } from "@/lib/supabase/appointment-management";
import type { AppointmentStatus } from "@/lib/types/appointments";

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="flex items-center gap-1.5 text-sm font-bold text-brand-pink">
        <span aria-hidden>{icon}</span> {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-800 font-medium text-right">{value || "—"}</span>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const serviceLabels: Record<string, string> = {
  dog_grooming: "Grooming Details",
  cat_grooming: "Grooming Details",
  boarding: "Boarding Details",
  ala_carte: "Ala Carte Details",
};

export default function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdateStatus,
}: {
  appointment: AppointmentRow;
  onClose: () => void;
  // REAL FIX: this now returns a real error (or null on success)
  // instead of firing-and-forgetting. The old version updated this
  // modal's own displayed status optimistically regardless of whether
  // the database write actually happened — if it silently failed
  // (network hiccup, a future RLS change, anything), the modal would
  // show "Confirmed" while the real row and the table behind it still
  // said "Pending," with no indication anything went wrong. That
  // mismatch is very likely what read as "the buttons aren't working
  // in real time" — they looked like they worked, but hadn't.
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<string | null>;
}) {
  const a = appointment;
  const isBoarding = a.service_type === "boarding";
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const next = nextValidStatus(a.status);

  async function handleStatusClick(status: AppointmentStatus) {
    setUpdating(true);
    setStatusError(null);
    const err = await onUpdateStatus(a.id, status);
    setUpdating(false);
    if (err) setStatusError(err);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-brand-tint rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">{serviceLabels[a.service_type] ?? "Appointment Details"}</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          <Section title="Owner Information" icon="📋">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-zinc-500">Status</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[a.status]}`}>{a.status.replace("_", " ")}</span>
            </div>
            <Row label="Owner Name" value={a.owner_name} />
            <Row label="Contact No." value={a.owner_contact} />
            <Row label="Address" value={a.owner_address} />
          </Section>

          {a.pets.map((pet) => (
            <Section key={pet.id} title={`Pet: ${pet.name}`} icon="🐾">
              <Row label="Breed" value={pet.breed} />
              <Row label="Size" value={pet.size_label} />
              {pet.packageName && <Row label="Package" value={pet.packageName} />}
              {pet.packagePricingLabel && <Row label="Duration & Rate" value={pet.packagePricingLabel} />}
              {pet.kennelLabel && <Row label="Kennel" value={pet.kennelLabel} />}
              {pet.groomerName && <Row label="Groomer" value={pet.groomerName} />}
              {pet.addonNames.length > 0 && <Row label="Add-ons" value={pet.addonNames.join(", ")} />}
              <Row label="Amount" value={`₱${pet.lineAmount.toLocaleString()}`} />
            </Section>
          ))}

          <Section title="Scheduled Appointment" icon="🕐">
            <Row label="Appointment Date" value={a.scheduled_date} />
            {isBoarding ? (
              <>
                <Row label="Drop Off Date / Time" value={a.drop_off_at ? new Date(a.drop_off_at).toLocaleString() : null} />
                <Row label="Pick Up Date / Time" value={a.pick_up_at ? new Date(a.pick_up_at).toLocaleString() : null} />
              </>
            ) : (
              <Row label="Time Slot" value={a.scheduled_time} />
            )}
            {a.groomerNames.length > 0 && <Row label="Groomer(s)" value={a.groomerNames.join(", ")} />}
          </Section>

          <Section title="Pricing" icon="💰">
            <div className="flex justify-between text-sm py-1.5 border-t border-pink-200 mt-1 pt-2">
              <span className="font-bold text-brand-pink">Total Amount</span>
              <span className="font-bold text-brand-pink">₱{a.total_amount.toLocaleString()}</span>
            </div>
          </Section>

          <Section title="Notes & Instruction" icon="📝">
            <div className="bg-white rounded-xl border border-pink-100 min-h-[60px] p-3 text-sm text-zinc-600">
              {a.special_requests || "No notes provided."}
            </div>
          </Section>

          <Section title="Action" icon="⚡">
            {statusError && <p className="mb-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{statusError}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStatusClick("confirmed")}
                disabled={updating || next !== "confirmed"}
                className="border-2 border-blue-400 text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs py-2 rounded-full hover:enabled:bg-blue-500 hover:enabled:text-white transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleStatusClick("checked_in")}
                disabled={updating || next !== "checked_in"}
                className="border-2 border-purple-400 text-purple-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs py-2 rounded-full hover:enabled:bg-purple-500 hover:enabled:text-white transition-colors"
              >
                Check In
              </button>
              <button
                onClick={() => handleStatusClick("completed")}
                disabled={updating || next !== "completed"}
                className="border-2 border-green-500 text-green-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs py-2 rounded-full hover:enabled:bg-green-500 hover:enabled:text-white transition-colors"
              >
                Complete
              </button>
              <button
                onClick={() => handleStatusClick("cancelled")}
                disabled={updating || a.status === "cancelled" || a.status === "completed"}
                className="border-2 border-red-400 text-red-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs py-2 rounded-full hover:enabled:bg-red-500 hover:enabled:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">
              {a.status === "completed" || a.status === "cancelled"
                ? "This appointment is finished — no further status changes."
                : `Next step: ${next ? next.replace("_", " ") : "—"}. Statuses move forward one step at a time; cancel is available until it's completed.`}
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
