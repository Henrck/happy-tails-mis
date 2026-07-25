"use client";
// Session detail modal. Actions change depending on stage:
//   scheduled    -> Cancel Session | Start Session
//   in_progress  -> Cancel Session | Mark as Completed (-> payment step)
//   [payment]    -> Cancel | Confirm Payment (-> completes the session)
//   completed    -> celebratory message, no actions
import { useState } from "react";
import type { GroomingSession, SessionStage } from "@/lib/data/grooming-sessions-mock";
import ProgressTimeline from "./ProgressTimeline";

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

const stageBadge: Record<SessionStage, string> = {
  scheduled: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-red-100 text-red-600",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-zinc-200 text-zinc-500",
};
const stageLabel: Record<SessionStage, string> = {
  scheduled: "Scheduled",
  in_progress: "Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function SessionDetailModal({
  session,
  onClose,
  onUpdateStage,
}: {
  session: GroomingSession;
  onClose: () => void;
  onUpdateStage: (id: string, stage: SessionStage, startedAt?: string) => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const addOnsTotal = session.addOns.reduce((sum, a) => sum + a.price, 0);
  const total = session.servicePrice + addOnsTotal;

  function handleStart() {
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    onUpdateStage(session.id, "in_progress", now);
  }

  function handleConfirmPayment() {
    onUpdateStage(session.id, "completed");
    setShowPayment(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">
            {showPayment ? "Confirm Payment" : "Session Details"}
          </h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showPayment ? (
          // --- Payment confirmation step ---
          <div className="px-6 py-6">
            <p className="text-sm text-zinc-500 text-center">Session Quotation</p>
            <div className="mt-4 bg-brand-tint rounded-2xl p-4">
              <Row label="Pet" value={`${session.petName} (${session.ownerName})`} />
              <Row label="Service" value={session.services.join(" — ")} />
              <Row label="Price" value={`₱${session.servicePrice.toLocaleString()}`} />
              <Row label="Add Ons" value={`₱${addOnsTotal.toLocaleString()}`} />
              <div className="flex justify-between text-base py-2 border-t border-pink-200 mt-1 pt-2">
                <span className="font-bold text-brand-pink">Total Due</span>
                <span className="font-bold text-brand-pink">₱{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm py-2.5 rounded-full transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <Section title="Progress Timeline" icon="📈">
              <ProgressTimeline stage={session.stage} />
            </Section>

            <Section title="Sessions Information" icon="📋">
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-zinc-500">Status</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${stageBadge[session.stage]}`}>
                  {stageLabel[session.stage]}
                </span>
              </div>
              <Row label="Owner Name" value={session.ownerName} />
              <Row label="Contact No." value={session.ownerContact} />
              <Row label="Address" value={session.ownerAddress} />
              <Row label="Pet Name" value={session.petName} />
              <Row label="Breed" value={session.breed} />
              <Row label="Pet Size (weight)" value={`${session.petWeightKg} kg`} />
              <Row label="Groomer" value={session.groomerName} />
            </Section>

            <Section title="Scheduled Appointment" icon="🕐">
              <Row label="Appointment" value={session.appointmentDate} />
              <Row label="Time Slot" value={session.timeSlot} />
              <Row label="Sessions Start" value={session.sessionStartedAt ?? "Not yet started"} />
            </Section>

            <Section title="Services" icon="✂️">
              <div>
                {session.services.map((s) => (
                  <Pill key={s}>{s}</Pill>
                ))}
              </div>
              {session.addOns.length > 0 && (
                <>
                  <p className="text-xs text-zinc-500 mt-1">Add-ons:</p>
                  <div>
                    {session.addOns.map((a) => (
                      <Pill key={a.name}>{a.name}</Pill>
                    ))}
                  </div>
                </>
              )}
            </Section>

            <Section title="Pricing" icon="💰">
              <Row label="Price" value={`₱${session.servicePrice.toLocaleString()}`} />
              <Row label="Add Ons Price" value={`₱${addOnsTotal.toLocaleString()}`} />
              <div className="flex justify-between text-sm py-1.5 border-t border-pink-200 mt-1 pt-2">
                <span className="font-bold text-brand-pink">Total Price</span>
                <span className="font-bold text-brand-pink">₱{total.toLocaleString()}</span>
              </div>
            </Section>

            <Section title="Notes & Instruction" icon="📝">
              <div className="bg-brand-tint rounded-xl border border-pink-100 min-h-[60px] p-3 text-sm text-zinc-600">
                {session.notes || "No notes provided."}
              </div>
            </Section>

            <Section title="Action" icon="⚡">
              {session.stage === "scheduled" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => onUpdateStage(session.id, "cancelled")}
                    className="flex-1 border-2 border-zinc-300 text-zinc-400 font-semibold text-sm py-2 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    Cancel Session
                  </button>
                  <button
                    onClick={handleStart}
                    className="flex-1 border-2 border-green-500 text-green-600 font-semibold text-sm py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Start Session
                  </button>
                </div>
              )}

              {session.stage === "in_progress" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => onUpdateStage(session.id, "cancelled")}
                    className="flex-1 border-2 border-zinc-300 text-zinc-400 font-semibold text-sm py-2 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    Cancel Session
                  </button>
                  <button
                    onClick={() => setShowPayment(true)}
                    className="flex-1 border-2 border-green-500 text-green-600 font-semibold text-sm py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Mark as Completed
                  </button>
                </div>
              )}

              {session.stage === "completed" && (
                <p className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <span aria-hidden>🎉</span> This Session has been completed!!
                </p>
              )}

              {session.stage === "cancelled" && (
                <p className="text-zinc-400 text-sm">This session was cancelled.</p>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
