"use client";
import { useState } from "react";
import { setStaffStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { StaffMember } from "@/lib/types/users";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-800 text-right">{value || "—"}</span>
    </div>
  );
}

export default function StaffDetailModal({
  staff,
  onClose,
  onChanged,
}: {
  staff: StaffMember;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate" | "archive" | "delete" | "resetPassword" | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(status: "active" | "inactive" | "archived") {
    setBusy(true);
    const { error } = await setStaffStatus(staff.id, status);
    setBusy(false);
    setConfirmAction(null);
    if (error) { showToast("Something went wrong. Try again.", "error"); return; }
    await logAudit(`staff.${status}`, "staff", staff.id);
    showToast(status === "archived" ? "Account archived." : "Status changed.");
    onChanged();
  }

  async function handleResetPassword() {
    setBusy(true);
    const res = await fetch(`/api/admin/reset-staff-password/${staff.id}`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    setConfirmAction(null);
    if (!res.ok) { showToast(data.error ?? "Failed to reset password.", "error"); return; }
    setTempPassword(data.tempPassword);
  }

  async function handleDelete() {
    setBusy(true);
    const res = await fetch(`/api/admin/delete-staff/${staff.id}`, { method: "DELETE" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { showToast(data.error ?? "Failed to delete account.", "error"); return; }
    showToast("Delete successful.");
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Staff Profile</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink font-bold text-xl">
              {staff.first_name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-zinc-900">{staff.first_name} {staff.last_name}</h4>
              <p className="text-xs text-zinc-400">{staff.employee_id}</p>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <Row label="Username" value={staff.username} />
            <Row label="Email" value={staff.email} />
            <Row label="Phone Number" value={staff.phone_number} />
            <Row label="Role" value={staff.job_title} />
            <Row label="Status" value={staff.status === "active" ? "Active" : staff.status === "inactive" ? "Inactive" : "Archived"} />
            <Row label="Date Created" value={new Date(staff.created_at).toLocaleDateString()} />
          </div>

          {tempPassword && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-semibold">New temporary password (share this with {staff.first_name} directly — it won't be shown again):</p>
              <p className="mt-1 font-mono text-sm bg-white rounded px-2 py-1.5 select-all">{tempPassword}</p>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmAction("resetPassword")} className="border-2 border-amber-400 text-amber-600 font-semibold text-sm py-2 rounded-full hover:bg-amber-500 hover:text-white transition-colors">
              Reset Password
            </button>
            {staff.status === "active" ? (
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
            <button onClick={() => setConfirmAction("delete")} className="border-2 border-red-400 text-red-500 font-semibold text-sm py-2 rounded-full hover:bg-red-500 hover:text-white transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>

      {confirmAction === "deactivate" && (
        <ConfirmDialog title="Deactivate Account" message={`${staff.first_name} won't be able to sign in until reactivated.`} confirmLabel="Deactivate" onConfirm={() => handleStatusChange("inactive")} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "activate" && (
        <ConfirmDialog title="Activate Account" message={`${staff.first_name} will be able to sign in again.`} confirmLabel="Activate" onConfirm={() => handleStatusChange("active")} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "archive" && (
        <ConfirmDialog title="Archive Account" message="This hides the account from the main list. It can be restored from Archive later." confirmLabel="Archive" onConfirm={() => handleStatusChange("archived")} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "delete" && (
        <ConfirmDialog title="Permanently Delete" message="This cannot be undone. The account and login will be removed entirely." confirmLabel="Delete Permanently" danger onConfirm={handleDelete} onCancel={() => setConfirmAction(null)} />
      )}
      {confirmAction === "resetPassword" && (
        <ConfirmDialog title="Reset Password" message={`Generate a new temporary password for ${staff.first_name}?`} confirmLabel="Reset" onConfirm={handleResetPassword} onCancel={() => setConfirmAction(null)} />
      )}
    </div>
  );
}
