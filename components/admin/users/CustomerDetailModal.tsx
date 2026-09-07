"use client";
// Customer detail — read-only monitoring, per Josh's explicit rule: "Do
// NOT allow editing customer personal information from this module."
// Only status controls are actionable here — name/email/phone/address
// are display-only.
import { useState } from "react";
import { setCustomerStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Customer } from "@/lib/types/users";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-800 text-right">{value || "—"}</span>
    </div>
  );
}

export default function CustomerDetailModal({
  customer,
  onClose,
  onChanged,
}: {
  customer: Customer;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate" | "archive" | null>(null);

  async function handleStatusChange(status: "active" | "inactive" | "archived") {
    const { error } = await setCustomerStatus(customer.id, status);
    setConfirmAction(null);
    if (error) { showToast("Something went wrong. Try again.", "error"); return; }
    await logAudit(`customer.${status}`, "customer", customer.id);
    showToast(status === "archived" ? "Account archived." : "Status changed.");
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Customer Details</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink font-bold text-xl">
              {customer.full_name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">{customer.full_name}</h4>
              <p className="text-xs text-zinc-400">{customer.customer_id}</p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <Row label="Email" value={customer.email} />
            <Row label="Phone Number" value={customer.phone_number} />
            <Row label="Address" value={customer.address} />
            <Row label="Registered Date" value={new Date(customer.registered_at).toLocaleDateString()} />
            <Row label="Status" value={customer.status === "active" ? "Active" : customer.status === "inactive" ? "Inactive" : "Archived"} />
          </div>

          <p className="mt-4 text-[11px] text-zinc-400 italic">
            Total Pets / Total Bookings / Last Appointment will appear here once the Pets and Appointments tables are real (currently mock data elsewhere in the app).
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {customer.status === "active" ? (
              <button onClick={() => setConfirmAction("deactivate")} className="border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">
                Deactivate
              </button>
            ) : (
              <button onClick={() => setConfirmAction("activate")} className="border-2 border-emerald-400 text-emerald-600 font-semibold text-sm py-2 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">
                Activate
              </button>
            )}
            <button onClick={() => setConfirmAction("archive")} className="border-2 border-orange-300 text-orange-500 font-semibold text-sm py-2 rounded-full hover:bg-orange-500 hover:text-white transition-colors">
              Archive
            </button>
          </div>
        </div>
      </div>

      {confirmAction === "deactivate" && (
        <ConfirmDialog title="Deactivate Account" message={`${customer.full_name} won't be able to sign in until reactivated.`} confirmLabel="Deactivate" onConfirm={() => handleStatusChange("inactive")} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "activate" && (
        <ConfirmDialog title="Activate Account" message={`${customer.full_name} will be able to sign in again.`} confirmLabel="Activate" onConfirm={() => handleStatusChange("active")} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "archive" && (
        <ConfirmDialog title="Archive Account" message="This hides the account from the main list. It can be restored from Archive later." confirmLabel="Archive" onConfirm={() => handleStatusChange("archived")} onCancel={() => setConfirmAction(null)} />
      )}
    </div>
  );
}
