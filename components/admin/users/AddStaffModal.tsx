"use client";
import { useState } from "react";
import { validatePassword, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";
import { useToast } from "@/components/ui/Toast";

type StaffForm = {
  firstName: string;
  middleName: string;
  lastName: string;
  username: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  jobTitle: string;
};

export default function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<StaffForm>({
    firstName: "", middleName: "", lastName: "", username: "",
    password: "", confirmPassword: "", phoneNumber: "", jobTitle: "Staff",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof StaffForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function clientValidate(): string | null {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.password) {
      return "First name, last name, username, and password are required.";
    }
    if (form.username.trim().length > 20) return "Username must be at most 20 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return validateUsername(form.username.trim()) ||
      validatePassword(form.password) ||
      (form.phoneNumber.trim() ? validatePhoneNumber(form.phoneNumber.trim()) : null);
  }

  async function handleSubmit() {
    if (saving) return;
    const problem = clientValidate();
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          firstName: form.firstName.trim(),
          middleName: form.middleName.trim(),
          lastName: form.lastName.trim(),
          username: form.username.trim(),
          phoneNumber: form.phoneNumber.trim(),
          jobTitle: form.jobTitle.trim(),
        }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) { setError(result.error ?? "Failed to create staff account."); return; }
      showToast("Staff account created successfully. The staff member can sign in with their username and password.");
      onCreated();
      onClose();
    } catch {
      setError("Could not reach the server. Check whether the account was created before trying again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => { if (!saving) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Add staff account" className="w-full max-w-md overflow-hidden rounded-3xl bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-brand-pink px-6 py-4">
          <h3 className="font-bold text-white">Add Staff Account</h3>
          <button type="button" aria-label="Close" disabled={saving} onClick={onClose} className="text-white disabled:opacity-50">✕</button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <p className="rounded-xl border border-pink-100 bg-pink-50 p-3 text-xs text-zinc-600">
            Staff sign in with a <strong>username and password</strong>. No email address or customer account is needed. Password resets are handled by Superadmin.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs font-semibold text-zinc-600">First Name *
              <input value={form.firstName} maxLength={80} autoComplete="off" onChange={(e) => update("firstName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Middle Name
              <input value={form.middleName} maxLength={80} autoComplete="off" onChange={(e) => update("middleName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Last Name *
              <input value={form.lastName} maxLength={80} autoComplete="off" onChange={(e) => update("lastName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-zinc-600">Role / Job Title
            <input value={form.jobTitle} maxLength={100} onChange={(e) => update("jobTitle", e.target.value)} placeholder="e.g. Staff, Groomer, Front Desk" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-zinc-400">Job title is a display label. Accounts created here have staff-level permissions, not Superadmin access.</span>
          </label>
          <label className="block text-xs font-semibold text-zinc-600">Username *
            <input value={form.username} maxLength={20} autoComplete="off" onChange={(e) => update("username", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-zinc-600">Phone Number (optional)
            <input type="tel" value={form.phoneNumber} autoComplete="off" onChange={(e) => update("phoneNumber", e.target.value)} placeholder="09171234567" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-zinc-600">Password *
              <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-semibold text-zinc-600">Confirm Password *
              <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <p className="text-[11px] text-zinc-400">Password: at least eight characters, with uppercase, lowercase, a number, and a special character.</p>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 text-sm font-semibold text-zinc-600 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void handleSubmit()} disabled={saving} className="flex-1 rounded-full bg-brand-pink py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create Staff Account"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
