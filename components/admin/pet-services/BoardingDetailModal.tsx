"use client";
// Boarding detail modal. Actions change depending on stage:
//   booked       -> Cancel Session | Check In Now
//   checked_in   -> Cancel Session | Check Out (-> payment step)
//   [payment]    -> Payment Method + Amount Paid (with live Change calc) | Cancel / Confirm Payment
//   checked_out  -> celebratory message, no actions
import { useState } from "react";
import type { BoardingSession, BoardingStage } from "@/lib/data/boarding-kennels-mock";
import BoardingProgressTimeline from "./BoardingProgressTimeline";

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

const stageBadge: Record<BoardingStage, string> = {
  booked: "bg-yellow-100 text-yellow-700",
  checked_in: "bg-red-100 text-red-600",
  checked_out: "bg-green-100 text-green-700",
  cancelled: "bg-zinc-200 text-zinc-500",
};
const stageLabel: Record<BoardingStage, string> = {
  booked: "Scheduled",
  checked_in: "Check in",
  checked_out: "Check Out",
  cancelled: "Cancelled",
};

export default function BoardingDetailModal({
  session,
  onClose,
  onUpdateStage,
}: {
  session: BoardingSession;
  onClose: () => void;
  onUpdateStage: (id: string, stage: BoardingStage, paymentMethod?: string, amountPaid?: number) => void;
}) {
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");

  const addOnsTotal = session.addOns.reduce((sum, a) => sum + a.price, 0);
  const total = session.servicePrice + addOnsTotal;
  const paidNumber = parseFloat(amountPaid) || 0;
  const change = paidNumber - total;
  const canConfirm = paidNumber >= total;

  function handleConfirmPayment() {
    if (!canConfirm) return;
    onUpdateStage(session.id, "checked_out", paymentMethod, paidNumber);
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
            {showPayment ? "Process Payment" : "Boarding Details"}
          </h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {showPayment ? (
          // --- Payment step ---
          <div className="px-6 py-6">
            <Row label="Pet" value={session.petName} />
            <Row label="Owner" value={session.ownerName} />
            <Row label="Services" value={session.services.join(", ")} />
            {session.addOns.length > 0 && (
              <Row label="Add-ons" value={session.addOns.map((a) => a.name).join(", ")} />
            )}

            <div className="mt-3 bg-brand-tint rounded-2xl p-4">
              <Row label="Services" value={`₱${session.servicePrice.toLocaleString()}`} />
              <Row label="Add-ons" value={`₱${addOnsTotal.toLocaleString()}`} />
              <div className="flex justify-between text-base py-2 border-t border-pink-200 mt-1 pt-2">
                <span className="font-bold text-brand-pink">Total Price</span>
                <span className="font-bold text-brand-pink">₱{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-brand-pink">Payment Method</p>
              <div className="mt-2 flex gap-2">
                {["Cash"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                      paymentMethod === method
                        ? "bg-brand-pink text-white"
                        : "border border-brand-pink text-brand-pink"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-semibold text-brand-pink">Amount Paid (₱)</label>
              <input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
              />
            </div>

            {amountPaid !== "" && (
              <div className={`mt-3 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                change >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {change >= 0 ? `Change ₱${change.toLocaleString()}` : `Short by ₱${Math.abs(change).toLocaleString()}`}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPayment(false)}
                className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!canConfirm}
                className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded-full transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <Section title="Progress Timeline" icon="📈">
              <BoardingProgressTimeline stage={session.stage} />
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
            </Section>

            <Section title="Scheduled Appointment" icon="🕐">
              <Row label="Appointment Date" value={session.appointmentDate} />
              <Row label="Duration" value={session.duration} />
              <Row label="Drop Off Date / Time" value={session.dropOffDateTime} />
              <Row label="Pick Up Date / time" value={session.pickUpDateTime} />
            </Section>

            <Section title="Services" icon="🐾">
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

            {session.belongings.length > 0 && (
              <Section title="Pet Belongings Brought" icon="🎒">
                <div>
                  {session.belongings.map((item) => (
                    <Pill key={item}>{item}</Pill>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Action" icon="⚡">
              {session.stage === "booked" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => onUpdateStage(session.id, "cancelled")}
                    className="flex-1 border-2 border-zinc-300 text-zinc-400 font-semibold text-sm py-2 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    Cancel Session
                  </button>
                  <button
                    onClick={() => onUpdateStage(session.id, "checked_in")}
                    className="flex-1 border-2 border-green-500 text-green-600 font-semibold text-sm py-2 rounded-full hover:bg-green-500 hover:text-white transition-colors"
                  >
                    Check In Now
                  </button>
                </div>
              )}

              {session.stage === "checked_in" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => onUpdateStage(session.id, "cancelled")}
                    className="flex-1 border-2 border-zinc-300 text-zinc-400 font-semibold text-sm py-2 rounded-full hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    Cancel Session
                  </button>
                  <button
                    onClick={() => setShowPayment(true)}
                    className="flex-1 border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
                  >
                    Check Out
                  </button>
                </div>
              )}

              {session.stage === "checked_out" && (
                <p className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <span aria-hidden>🎉</span> This boarding has been completed!!
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
