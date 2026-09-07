"use client";
import { useState } from "react";
import { validatePassword } from "@/lib/validation/staff";
import { changeOwnPassword } from "@/lib/supabase/profile";
import { useToast } from "@/components/ui/Toast";

export default function ChangePasswordModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { showToast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!current.trim()) { setError("Enter your current password."); return; }
    if (next !== confirm) { setError("New passwords do not match."); return; }
    const pwError = validatePassword(next);
    if (pwError) { setError(pwError); return; }

    setSaving(true);
    const result = await changeOwnPassword(current, next);
    setSaving(false);

    if (result.error) { setError(result.error); return; }
    showToast("Password changed successfully.");
    onChanged();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-brand-pink px-6 py-4">
          <h3 className="text-white font-bold">Change Password</h3>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-zinc-600">Current Password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">New Password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-600">Confirm New Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          </div>
          <p className="text-[11px] text-zinc-400">At least 8 characters, with uppercase, lowercase, a number, and a special character.</p>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm py-2 rounded-full transition-colors">
              {saving ? "Saving..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
