"use client";
import { useState, useMemo } from "react";
import { setStaffStatus, setCustomerStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { StaffMember, Customer } from "@/lib/types/users";

export default function ArchiveModal({
  archivedStaff,
  archivedCustomers,
  onClose,
  onChanged,
}: {
  archivedStaff: StaffMember[];
  archivedCustomers: Customer[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ type: "staff" | "customer"; id: string; name: string } | null>(null);

  const filteredStaff = useMemo(
    () => archivedStaff.filter((s) => !search.trim() || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())),
    [archivedStaff, search]
  );
  const filteredCustomers = useMemo(
    () => archivedCustomers.filter((c) => !search.trim() || c.full_name.toLowerCase().includes(search.toLowerCase())),
    [archivedCustomers, search]
  );

  async function handleRestoreStaff(s: StaffMember) {
    await setStaffStatus(s.id, "active");
    await logAudit("staff.restored", "staff", s.id);
    showToast("Account restored.");
    onChanged();
  }
  async function handleRestoreCustomer(c: Customer) {
    await setCustomerStatus(c.id, "active");
    await logAudit("customer.restored", "customer", c.id);
    showToast("Account restored.");
    onChanged();
  }

  async function handlePermanentDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "staff") {
      const res = await fetch(`/api/admin/delete-staff/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { showToast("Failed to delete.", "error"); setDeleteTarget(null); return; }
    } else {
      // Customer permanent delete deliberately NOT wired to a server
      // route yet — deleting a customer's auth account has bigger
      // implications (their booking/pet history references their user
      // id) than staff. Flagging rather than silently building it.
      showToast("Permanent customer deletion isn't wired up yet — needs a decision on what happens to their booking history first.", "error");
      setDeleteTarget(null);
      return;
    }
    showToast("Delete successful.");
    setDeleteTarget(null);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 flex items-center justify-between sticky top-0">
          <h3 className="text-white font-bold">Archived Accounts</h3>
          <button onClick={onClose} className="text-white hover:opacity-80" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <input
            type="text"
            placeholder="Search archived accounts"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />

          <h4 className="mt-5 text-sm font-bold text-brand-pink">Staff</h4>
          <div className="mt-2 space-y-2">
            {filteredStaff.length === 0 ? (
              <p className="text-sm text-zinc-400">No archived staff.</p>
            ) : (
              filteredStaff.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-zinc-700">{s.first_name} {s.last_name} · {s.employee_id}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestoreStaff(s)} className="text-xs font-semibold text-emerald-600 border border-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">Restore</button>
                    <button onClick={() => setDeleteTarget({ type: "staff", id: s.id, name: `${s.first_name} ${s.last_name}` })} className="text-xs font-semibold text-red-500 border border-red-400 px-3 py-1 rounded-full hover:bg-red-500 hover:text-white transition-colors">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 className="mt-5 text-sm font-bold text-brand-pink">Customers</h4>
          <div className="mt-2 space-y-2">
            {filteredCustomers.length === 0 ? (
              <p className="text-sm text-zinc-400">No archived customers.</p>
            ) : (
              filteredCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm text-zinc-700">{c.full_name} · {c.customer_id}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestoreCustomer(c)} className="text-xs font-semibold text-emerald-600 border border-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500 hover:text-white transition-colors">Restore</button>
                    <button onClick={() => setDeleteTarget({ type: "customer", id: c.id, name: c.full_name })} className="text-xs font-semibold text-red-500 border border-red-400 px-3 py-1 rounded-full hover:bg-red-500 hover:text-white transition-colors">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Permanently Delete"
          message={`This cannot be undone. "${deleteTarget.name}" and their login will be removed entirely.`}
          confirmLabel="Delete Permanently"
          danger
          onConfirm={handlePermanentDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
