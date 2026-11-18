"use client";
import { useState } from "react";
import { setCustomerStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Customer } from "@/lib/types/users";
import { useStaffRole } from "@/lib/hooks/useStaffRole";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-1 text-sm"><span className="text-zinc-500">{label}</span><span className="text-right font-medium text-zinc-800">{value || "—"}</span></div>;
}
function manilaDate(value: string) {
  return new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function CustomerDetailModal({ customer, onClose, onChanged }: { customer: Customer; onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate" | "archive" | null>(null);
  const [restrictionAction, setRestrictionAction] = useState<"restrict" | "lift" | null>(null);
  const [duration, setDuration] = useState("1");
  const [restrictionReason, setRestrictionReason] = useState("");
  const [restrictionSaving, setRestrictionSaving] = useState(false);
  const [restrictionError, setRestrictionError] = useState("");
  const isSuperAdmin = useStaffRole() === "superadmin";
  const [resetOpen, setResetOpen] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState("");

  async function handleStatusChange(status: "active" | "inactive" | "archived") {
    const { error } = await setCustomerStatus(customer.id, status);
    setConfirmAction(null);
    if (error) { showToast("Something went wrong. Try again.", "error"); return; }
    await logAudit(`customer.${status}`, "customer", customer.id);
    showToast(status === "archived" ? "Account archived." : "Status changed.");
    onChanged();
  }

  async function saveRestriction() {
    if (!restrictionAction || restrictionReason.trim().length < 5 || restrictionReason.trim().length > 500 || restrictionSaving) return;
    setRestrictionSaving(true); setRestrictionError("");
    try {
      const response = await fetch("/api/admin/customer-booking-restriction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, action: restrictionAction, reason: restrictionReason.trim(), duration }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to update booking restriction.");
      showToast(restrictionAction === "restrict" ? "Booking restriction applied." : "Booking restriction lifted.");
      setRestrictionAction(null); setRestrictionReason(""); await onChanged(); onClose();
    } catch (error) {
      setRestrictionError(error instanceof Error ? error.message : "Unable to update booking restriction.");
    } finally { setRestrictionSaving(false); }
  }

  async function resetPenalties() {
    if (resetReason.trim().length < 5 || resetReason.trim().length > 500 || resetSaving) return;
    setResetSaving(true); setResetError("");
    try {
      const response = await fetch("/api/admin/customer-penalty-reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id, reason: resetReason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to reset penalty points.");
      showToast("Penalty points reset to 0/3.");
      setResetOpen(false); setResetReason(""); await onChanged(); onClose();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Unable to reset penalty points.");
    } finally { setResetSaving(false); }
  }

  const restricted = Boolean(customer.is_booking_restricted);
  const points = customer.penalty_count ?? 0;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white" onClick={(event) => event.stopPropagation()}>
      <div className="sticky top-0 flex items-center justify-between bg-brand-pink px-6 py-4"><h3 className="font-bold text-white">Customer Details</h3><button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg></button></div>
      <div className="px-6 py-5">
        <div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-xl font-bold text-brand-pink">{customer.full_name.charAt(0)}</div><div><h4 className="font-bold text-zinc-900">{customer.full_name}</h4><p className="text-xs text-zinc-400">{customer.customer_id}</p></div></div>
        <div className="mt-4 space-y-1"><Row label="Email" value={customer.email} /><Row label="Phone Number" value={customer.phone_number} /><Row label="Address" value={customer.address} /><Row label="Registered Date" value={new Date(customer.registered_at).toLocaleDateString()} /><Row label="Account Status" value={customer.status === "active" ? "Active" : customer.status === "inactive" ? "Inactive" : "Archived"} /></div>

        <section className="mt-5 rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
          <div className="flex items-center justify-between gap-3"><h4 className="font-bold text-zinc-800">Cancellation Penalties</h4><span className={`rounded-full px-3 py-1 text-sm font-bold ${points >= 3 ? "bg-red-100 text-red-700" : points > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{points}/3</span></div>
          <p className="mt-2 text-xs leading-5 text-zinc-600">Penalty points are separate from account login status. A cancellation less than 3 days before the appointment, or a customer&apos;s 4th+ cancellation in one day, adds 1 point (12-hour restriction); an automatic no-show adds 2 points (2-day restriction); 3 points restrict booking for 1 month. Each point expires after 60 days, and points go back to 0/3 when a 1-month restriction ends.</p>
          <div className="mt-3 rounded-xl bg-white p-3 text-sm">
            <Row label="Booking restriction" value={restricted ? <span className="font-bold text-red-600">Active</span> : <span className="font-bold text-emerald-600">None</span>} />
            {restricted && <Row label="Restriction until" value={customer.booking_restricted_until ? manilaDate(customer.booking_restricted_until) : "Until manually lifted"} />}
            {customer.manual_restriction_reason && <Row label="Manual reason" value={customer.manual_restriction_reason} />}
            {customer.penalty_restricted_until && <Row label="Automatic restriction" value={manilaDate(customer.penalty_restricted_until)} />}
          </div>
          <button type="button" onClick={() => { setRestrictionAction(restricted ? "lift" : "restrict"); setRestrictionReason(""); setRestrictionError(""); }} className={`mt-3 w-full rounded-full border-2 px-4 py-2.5 text-sm font-bold ${restricted ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50" : "border-red-400 text-red-600 hover:bg-red-50"}`}>{restricted ? "Lift Booking Restriction" : "Restrict Booking"}</button>
          {isSuperAdmin && (points > 0 || customer.penalty_restricted_until) && <button type="button" onClick={() => { setResetOpen(true); setResetReason(""); setResetError(""); }} className="mt-2 w-full rounded-full border-2 border-brand-pink px-4 py-2.5 text-sm font-bold text-brand-pink hover:bg-brand-tint">Reset Penalties to 0/3</button>}
        </section>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {customer.status === "active" ? <button onClick={() => setConfirmAction("deactivate")} className="rounded-full border-2 border-zinc-300 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:border-zinc-400">Deactivate</button> : <button onClick={() => setConfirmAction("activate")} className="rounded-full border-2 border-emerald-400 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-500 hover:text-white">Activate</button>}
          <button onClick={() => setConfirmAction("archive")} className="rounded-full border-2 border-orange-300 py-2 text-sm font-semibold text-orange-500 transition-colors hover:bg-orange-500 hover:text-white">Archive</button>
        </div>
      </div>
    </div>

    {confirmAction === "deactivate" && <ConfirmDialog title="Deactivate Account" message={`${customer.full_name} won't be able to sign in until reactivated.`} confirmLabel="Deactivate" onConfirm={() => handleStatusChange("inactive")} onCancel={() => setConfirmAction(null)} />}
    {confirmAction === "activate" && <ConfirmDialog title="Activate Account" message={`${customer.full_name} will be able to sign in again.`} confirmLabel="Activate" onConfirm={() => handleStatusChange("active")} onCancel={() => setConfirmAction(null)} />}
    {confirmAction === "archive" && <ConfirmDialog title="Archive Account" message="This hides the account from the main list. It can be restored from Archive later." confirmLabel="Archive" onConfirm={() => handleStatusChange("archived")} onCancel={() => setConfirmAction(null)} />}

    {restrictionAction && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => { if (event.target === event.currentTarget && !restrictionSaving) setRestrictionAction(null); }}>
      <div role="dialog" aria-modal="true" aria-label="Booking restriction" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-zinc-900">{restrictionAction === "restrict" ? "Restrict Customer Booking" : "Lift Booking Restriction"}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{restrictionAction === "restrict" ? "This prevents the customer from creating new appointments. Existing appointments remain unchanged." : "This clears the active automatic and manual booking restriction. Penalty points stay as they are; a Super Admin can reset them separately."}</p>
        {restrictionAction === "restrict" && <label className="mt-4 block text-sm font-semibold">Restriction duration<select value={duration} onChange={(event) => setDuration(event.target.value)} className="mt-2 w-full rounded-xl border border-pink-200 p-3"><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="permanent">Until manually lifted</option></select></label>}
        <label className="mt-4 block text-sm font-semibold">Reason *<textarea value={restrictionReason} onChange={(event) => setRestrictionReason(event.target.value)} maxLength={500} rows={3} placeholder="Enter the reason for this action" className="mt-2 w-full rounded-xl border border-pink-200 p-3 font-normal" /></label>
        {restrictionError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{restrictionError}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={restrictionSaving} onClick={() => setRestrictionAction(null)} className="rounded-full border border-zinc-300 py-3 text-sm font-semibold">Cancel</button><button type="button" disabled={restrictionSaving || restrictionReason.trim().length < 5} onClick={() => void saveRestriction()} className={`rounded-full py-3 text-sm font-bold text-white disabled:opacity-40 ${restrictionAction === "restrict" ? "bg-red-600" : "bg-emerald-600"}`}>{restrictionSaving ? "Saving…" : restrictionAction === "restrict" ? "Confirm Restriction" : "Confirm Lift"}</button></div>
      </div>
    </div>}
    {resetOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => { if (event.target === event.currentTarget && !resetSaving) setResetOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Reset penalty points" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-zinc-900">Reset Penalty Points</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{customer.full_name}&apos;s points go from {points}/3 to 0/3 and any automatic penalty restriction ends. A manual restriction set by staff stays in place. The penalty history is kept and this reset is recorded.</p>
        <label className="mt-4 block text-sm font-semibold">Reason *<textarea value={resetReason} onChange={(event) => setResetReason(event.target.value)} maxLength={500} rows={3} placeholder="Why are the points being reset?" className="mt-2 w-full rounded-xl border border-pink-200 p-3 font-normal" /></label>
        {resetError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{resetError}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={resetSaving} onClick={() => setResetOpen(false)} className="rounded-full border border-zinc-300 py-3 text-sm font-semibold">Cancel</button><button type="button" disabled={resetSaving || resetReason.trim().length < 5} onClick={() => void resetPenalties()} className="rounded-full bg-brand-pink py-3 text-sm font-bold text-white disabled:opacity-40">{resetSaving ? "Resetting…" : "Reset to 0/3"}</button></div>
      </div>
    </div>}
  </div>;
}
