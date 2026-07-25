"use client";
// Appointment detail modal, shown when the eye icon is clicked in the
// table. Renders different fields depending on serviceType — grooming
// shows Groomer/Time Slot/Session Start, boarding shows Duration/Drop-off/
// Pick-up — everything else (owner, pricing, notes, actions) is shared.
import type { Appointment } from "@/lib/data/admin-appointments-mock";

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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-brand-tint text-brand-pink text-xs font-semibold px-3 py-1 rounded-full mr-2 mb-2">
      {children}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function AppointmentDetailModal({
  appointment,
  onClose,
  onConfirm,
  onCancel,
}: {
  appointment: Appointment;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const a = appointment;
  const addOnsTotal = a.addOns.reduce((sum, x) => sum + x.price, 0);
  const total = a.servicePrice + addOnsTotal;
  const isBoarding = a.serviceType === "boarding";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-brand-tint rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">
            {isBoarding ? "Boarding Details" : "Grooming Details"}
          </h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          <Section title="Sessions Information" icon="📋">
            <div className="flex justify-between items-center py-1">
              <span className="text-sm text-zinc-500">Status</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyles[a.status]}`}>
                {a.status}
              </span>
            </div>
            <Row label="Owner Name" value={a.ownerName} />
            <Row label="Contact No." value={a.ownerContact} />
            <Row label="Address" value={a.ownerAddress} />
            <Row label="Pet Name" value={a.petName} />
            <Row label="Breed" value={a.breed} />
            <Row label="Pet Size (weight)" value={`${a.petWeightKg} kg`} />
            {!isBoarding && <Row label="Groomer" value={a.groomer} />}
          </Section>

          <Section title="Scheduled Appointment" icon="🕐">
            <Row label="Appointment Date" value={a.appointmentDate} />
            {isBoarding ? (
              <>
                <Row label="Duration" value={a.duration} />
                <Row label="Drop Off Date / Time" value={a.dropOffDateTime} />
                <Row label="Pick Up Date / time" value={a.pickUpDateTime} />
              </>
            ) : (
              <>
                <Row label="Time Slot" value={a.timeSlot} />
                <Row label="Sessions Start" value={a.sessionStart ?? "Not yet started"} />
              </>
            )}
          </Section>

          <Section title="Services" icon="🐾">
            <div>
              <Pill>{isBoarding ? "Boarding" : "Grooming"}</Pill>
              <Pill>{a.packageName}</Pill>
              {isBoarding && a.duration && <Pill>{a.duration}</Pill>}
            </div>
            {a.addOns.length > 0 && (
              <>
                <p className="text-xs text-zinc-500 mt-1">Add-ons:</p>
                <div>
                  {a.addOns.map((addOn) => (
                    <Pill key={addOn.name}>{addOn.name}</Pill>
                  ))}
                </div>
              </>
            )}
          </Section>

          <Section title="Pricing" icon="💰">
            <Row label="Price" value={`₱${a.servicePrice.toLocaleString()}`} />
            <Row label="Add Ons Price" value={`₱${addOnsTotal.toLocaleString()}`} />
            <div className="flex justify-between text-sm py-1.5 border-t border-pink-200 mt-1 pt-2">
              <span className="font-bold text-brand-pink">Total Price</span>
              <span className="font-bold text-brand-pink">₱{total.toLocaleString()}</span>
            </div>
          </Section>

          <Section title="Notes & Instruction" icon="📝">
            <div className="bg-white rounded-xl border border-pink-100 min-h-[60px] p-3 text-sm text-zinc-600">
              {a.notes || "No notes provided."}
            </div>
          </Section>

          {a.belongings.length > 0 && (
            <Section title="Pet Belongings Brought" icon="🎒">
              <div>
                {a.belongings.map((item) => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
            </Section>
          )}

          <Section title="Action" icon="⚡">
            <div className="flex gap-3">
              <button
                onClick={() => onCancel(a.id)}
                disabled={a.status === "Cancelled"}
                className="flex-1 border-2 border-zinc-300 text-zinc-400 disabled:opacity-50 font-semibold text-sm py-2 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
              >
                Cancel Session
              </button>
              <button
                onClick={() => onConfirm(a.id)}
                disabled={a.status === "Confirmed"}
                className="flex-1 border-2 border-green-500 text-green-600 disabled:opacity-50 font-semibold text-sm py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
              >
                Confirmed
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
