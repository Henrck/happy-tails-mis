"use client";
import { useState } from "react";
import { validatePassword, validateEmail, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";
import { useToast } from "@/components/ui/Toast";

export default function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", username: "",
    password: "", confirmPassword: "", email: "", phoneNumber: "", jobTitle: "Staff",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function clientValidate(): string | null {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      return "Please fill in all required fields.";
    }
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return (
      validateUsername(form.username) ||
      validateEmail(form.email) ||
      validatePassword(form.password) ||
      (form.phoneNumber ? validatePhoneNumber(form.phoneNumber) : null)
    );
  }

  async function handleSubmit() {
    const clientError = clientValidate();
    if (clientError) { setError(clientError); return; }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/create-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Failed to create account."); return; }

    showToast("Account created successfully.");
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4 sticky top-0">
          <h3 className="text-white font-bold">Add Account</h3>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600">First Name</label>
              <input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Middle Name</label>
              <input value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Last Name</label>
              <input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Role / Job Title</label>
            <input value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="e.g. Admin, Groomer, Front Desk" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            <p className="mt-1 text-[11px] text-zinc-400">Label only — every account created here has the same access level.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Username</label>
            <input value={form.username} onChange={(e) => update("username", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Email</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-600">Phone Number</label>
            <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="09171234567" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600">Password</label>
              <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            At least 8 characters, with uppercase, lowercase, a number, and a special character.
          </p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2.5 rounded-full hover:border-zinc-400 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-full transition-colors">
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
