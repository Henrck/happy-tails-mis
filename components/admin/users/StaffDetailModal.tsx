"use client";
import { useState } from "react";
import { setStaffStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { StaffMember } from "@/lib/types/users";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-3 py-1 text-sm"><span className="text-zinc-500">{label}</span><span className="text-right font-medium text-zinc-800">{value || "—"}</span></div>;
}

export default function StaffDetailModal({ staff, onClose, onChanged }: {
  staff: StaffMember;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate" | "archive" | "resetPassword" | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(status: "active" | "inactive" | "archived") {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await setStaffStatus(staff.id, status);
      if (error) { showToast(error.message, "error"); return; }
      await logAudit(`staff.${status}`, "staff", staff.id);
      showToast(status === "archived" ? "Staff account archived." : "Staff status changed.");
      onChanged();
      if (status === "archived") onClose();
    } catch {
      showToast("Unable to change staff status.", "error");
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  async function handleResetPassword() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/reset-staff-password/${encodeURIComponent(staff.id)}`, { method: "POST" });
      const result: { error?: string; tempPassword?: string } = await response.json();
      if (!response.ok || !result.tempPassword) {
        showToast(result.error ?? "Failed to reset password.", "error");
        return;
      }
      setTempPassword(result.tempPassword);
    } catch {
      showToast("Password reset request failed.", "error");
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { if (!busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Staff profile" className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between bg-brand-pink px-6 py-4">
          <h3 className="font-bold text-white">Staff Profile</h3>
          <button type="button" disabled={busy} onClick={onClose} aria-label="Close" className="text-white disabled:opacity-50">✕</button>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-tint text-xl font-bold text-brand-pink">{staff.first_name.charAt(0)}</div>
            <div><h4 className="font-bold text-zinc-900">{staff.first_name} {staff.last_name}</h4><p className="text-xs text-zinc-400">{staff.employee_id}</p></div>
          </div>
          <div className="mt-4 space-y-1">
            <Row label="Username" value={staff.username} />
            {staff.email && !staff.email.endsWith(".invalid") && <Row label="Email" value={staff.email} />}
            <Row label="Phone Number" value={staff.phone_number} />
            <Row label="Role" value={staff.job_title} />
            <Row label="Status" value={staff.status === "active" ? "Active" : staff.status === "inactive" ? "Inactive" : "Archived"} />
            <Row label="Date Created" value={new Date(staff.created_at).toLocaleDateString()} />
          </div>
          {tempPassword && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">New temporary password. Share it with {staff.first_name} privately; it will not be displayed again.</p>
            <p className="mt-2 select-all rounded-lg bg-white p-2 font-mono text-sm break-all">{tempPassword}</p>
          </div>}
          <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">Accounts are retained for audit and historical records. Use Archive instead of deleting staff accounts.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => setConfirmAction("resetPassword")} className="rounded-full border-2 border-amber-400 py-2 text-sm font-semibold text-amber-600 disabled:opacity-50">Reset Password</button>
            {staff.status === "active"
              ? <button type="button" disabled={busy} onClick={() => setConfirmAction("deactivate")} className="rounded-full border-2 border-zinc-300 py-2 text-sm font-semibold text-zinc-600 disabled:opacity-50">Deactivate</button>
              : <button type="button" disabled={busy} onClick={() => setConfirmAction("activate")} className="rounded-full border-2 border-emerald-400 py-2 text-sm font-semibold text-emerald-600 disabled:opacity-50">Activate</button>}
            {staff.status !== "archived" && <button type="button" disabled={busy} onClick={() => setConfirmAction("archive")} className="col-span-2 rounded-full border-2 border-orange-300 py-2 text-sm font-semibold text-orange-600 disabled:opacity-50">Archive Account</button>}
          </div>
        </div>
      </div>
      {confirmAction === "deactivate" && <ConfirmDialog title="Deactivate Account" message={`${staff.first_name} won't be able to sign in until reactivated.`} confirmLabel={busy ? "Updating…" : "Deactivate"} onConfirm={() => void handleStatusChange("inactive")} onCancel={() => { if (!busy) setConfirmAction(null); }} />}
      {confirmAction === "activate" && <ConfirmDialog title="Activate Account" message={`${staff.first_name} will be able to sign in again.`} confirmLabel={busy ? "Updating…" : "Activate"} onConfirm={() => void handleStatusChange("active")} onCancel={() => { if (!busy) setConfirmAction(null); }} />}
      {confirmAction === "archive" && <ConfirmDialog title="Archive Account" message="This preserves the account for audit and history. Archived staff cannot sign in and can later be restored." confirmLabel={busy ? "Updating…" : "Archive"} onConfirm={() => void handleStatusChange("archived")} onCancel={() => { if (!busy) setConfirmAction(null); }} />}
      {confirmAction === "resetPassword" && <ConfirmDialog title="Reset Password" message={`Generate a temporary password for ${staff.first_name}?`} confirmLabel={busy ? "Resetting…" : "Reset"} onConfirm={() => void handleResetPassword()} onCancel={() => { if (!busy) setConfirmAction(null); }} />}
    </div>
  );
}
