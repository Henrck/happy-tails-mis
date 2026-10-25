"use client";
import { useMemo, useState } from "react";
import { setStaffStatus, setCustomerStatus, logAudit } from "@/lib/supabase/users";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { StaffMember, Customer } from "@/lib/types/users";

type RestoreTarget = { type: "staff"; member: StaffMember } | { type: "customer"; member: Customer };

export default function ArchiveModal({ archivedStaff, archivedCustomers, onClose, onChanged }: {
  archivedStaff: StaffMember[];
  archivedCustomers: Customer[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [restore, setRestore] = useState<RestoreTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const filteredStaff = useMemo(() => archivedStaff.filter(s => !search.trim() || `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.trim().toLowerCase())), [archivedStaff, search]);
  const filteredCustomers = useMemo(() => archivedCustomers.filter(c => !search.trim() || c.full_name.toLowerCase().includes(search.trim().toLowerCase())), [archivedCustomers, search]);

  async function handleRestore() {
    if (!restore || busy) return;
    setBusy(true);
    try {
      const result = restore.type === "staff"
        ? await setStaffStatus(restore.member.id, "active")
        : await setCustomerStatus(restore.member.id, "active");
      if (result.error) { showToast(result.error.message, "error"); return; }
      const { type, member } = restore;
      await logAudit(`${type}.restored`, type, member.id);
      showToast("Account restored successfully.");
      setRestore(null);
      onChanged();
    } catch {
      showToast("Unable to restore this account.", "error");
    } finally {
      setBusy(false);
    }
  }

  const restoreName = restore ? restore.type === "staff"
    ? `${restore.member.first_name} ${restore.member.last_name}`
    : restore.member.full_name : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { if (!busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Archived accounts" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between bg-brand-pink px-6 py-4">
          <h3 className="font-bold text-white">Archived Accounts</h3>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="text-white disabled:opacity-50">✕</button>
        </div>
        <div className="px-6 py-5">
          <p className="mb-4 text-xs text-zinc-500">Archived accounts are kept for historical and audit records. Restore an account to grant access again.</p>
          <input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search archived accounts" placeholder="Search archived accounts" className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm" />
          <h4 className="mt-5 text-sm font-bold text-brand-pink">Staff</h4>
          <div className="mt-2 space-y-2">
            {filteredStaff.length === 0 ? <p className="text-sm text-zinc-400">No archived staff.</p> : filteredStaff.map(member =>
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-2.5">
                <span className="text-sm text-zinc-700">{member.first_name} {member.last_name} · {member.employee_id}</span>
                <button type="button" disabled={busy} onClick={() => setRestore({ type: "staff", member })} className="rounded-full border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-600 disabled:opacity-50">Restore</button>
              </div>)}
          </div>
          <h4 className="mt-5 text-sm font-bold text-brand-pink">Customers</h4>
          <div className="mt-2 space-y-2">
            {filteredCustomers.length === 0 ? <p className="text-sm text-zinc-400">No archived customers.</p> : filteredCustomers.map(member =>
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-zinc-50 px-4 py-2.5">
                <span className="text-sm text-zinc-700">{member.full_name} · {member.customer_id}</span>
                <button type="button" disabled={busy} onClick={() => setRestore({ type: "customer", member })} className="rounded-full border border-emerald-400 px-3 py-1 text-xs font-semibold text-emerald-600 disabled:opacity-50">Restore</button>
              </div>)}
          </div>
        </div>
      </div>
      {restore && <ConfirmDialog title="Restore Account" message={`Restore ${restoreName}? This will reactivate their login.`} confirmLabel={busy ? "Restoring…" : "Restore"} onConfirm={() => void handleRestore()} onCancel={() => { if (!busy) setRestore(null); }} />}
    </div>
  );
}
