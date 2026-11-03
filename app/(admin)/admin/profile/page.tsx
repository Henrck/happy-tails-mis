"use client";
import { useState, useEffect } from "react";
import { fetchOwnProfile, updateOwnProfile, uploadAvatar } from "@/lib/supabase/profile";
import { changeSuperadminUsername } from "@/lib/supabase/superadmin-username";
import { splitFullName } from "@/lib/types/profile";
import { validateEmail, validatePhoneNumber, validateUsername } from "@/lib/validation/staff";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import ChangePasswordModal from "@/components/admin/profile/ChangePasswordModal";
import type { OwnProfile } from "@/lib/types/profile";

function ProfilePageInner() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    dateOfBirth: "", phoneNumber: "", email: "", address: "", recoveryEmail: "",
  });

  function loadIntoForm(p: OwnProfile) {
    const { first, middle, last } = splitFullName(p.full_name);
    setForm({
      firstName: first, middleName: middle, lastName: last,
      dateOfBirth: p.date_of_birth ?? "",
      phoneNumber: p.phone_number ?? "",
      email: p.email,
      address: p.address ?? "",
      recoveryEmail: p.recovery_email ?? "",
    });
  }

  async function load() {
    const { profile: updated, error: loadError } = await fetchOwnProfile();
    if (updated) { setProfile(updated); loadIntoForm(updated); }
    else if (loadError) showToast(loadError, "error");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    if (profile) loadIntoForm(profile);
    setError(null);
    setEditMode(false);
  }

  async function handleSave() {
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.phoneNumber.trim() || !form.email.trim()) {
      setError("First name, last name, phone number, and email are required.");
      return;
    }
    const phoneError = validatePhoneNumber(form.phoneNumber);
    if (phoneError) { setError(phoneError); return; }
    const emailError = validateEmail(form.email);
    if (emailError) { setError(emailError); return; }
    if (form.recoveryEmail) {
      const recoveryError = validateEmail(form.recoveryEmail);
      if (recoveryError) { setError(`Recovery email: ${recoveryError}`); return; }
    }

    setSaving(true);
    const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
    try {
      const result = await updateOwnProfile({
        fullName,
        phoneNumber: form.phoneNumber,
        email: form.email,
        dateOfBirth: form.dateOfBirth || null,
        address: form.address,
        recoveryEmail: form.recoveryEmail,
      });
      if (result.error) { setError(result.error); return; }
      showToast(result.emailChangePending ? "Saved. Check your new email to confirm the change." : "Profile updated.");
      setEditMode(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update profile.");
    } finally { setSaving(false); }
  }

  function openUsernameEditor() {
    if (!profile || profile.role !== "superadmin") return;
    setUsernameDraft(profile.username ?? "");
    setUsernameError(null);
    setUsernameOpen(true);
  }

  async function saveUsername() {
    if (!profile || profile.role !== "superadmin" || usernameSaving) return;
    const cleaned = usernameDraft.trim();
    const invalid = validateUsername(cleaned);
    if (invalid || cleaned.length > 20) {
      setUsernameError(invalid ?? "Username must not exceed 20 characters.");
      return;
    }
    if (cleaned === profile.username) { setUsernameOpen(false); return; }
    setUsernameSaving(true);
    setUsernameError(null);
    try {
      const result = await changeSuperadminUsername(cleaned);
      if (result.error || !result.username) {
        setUsernameError(result.error ?? "Username update could not be confirmed.");
        return;
      }
      // The RPC updates profiles.username AND staff_profiles.username atomically.
      // Updating local state avoids resetting any unsaved, unrelated profile fields.
      setProfile((previous) => previous ? { ...previous, username: result.username } : previous);
      setUsernameOpen(false);
      showToast("Username changed. Use the new username at your next sign-in.");
    } catch (caught) {
      setUsernameError(caught instanceof Error ? caught.message : "Unable to change username.");
    } finally { setUsernameSaving(false); }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { error: avatarError, url } = await uploadAvatar(file);
    setUploadingAvatar(false);
    if (avatarError) { showToast(avatarError, "error"); return; }
    if (url && profile) setProfile({ ...profile, profile_picture_url: url });
    showToast("Profile photo updated.");
  }

  if (loading) return <p className="text-zinc-400">Loading profile...</p>;
  if (!profile) return <p className="text-red-500">Couldn't load your profile.</p>;

  const inputClass = (disabled: boolean) =>
    `mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm transition-shadow focus:outline-none ${
      disabled ? "border-zinc-200 bg-zinc-50 text-zinc-500" : "border-zinc-300 focus:ring-2 focus:ring-brand-pink"
    }`;

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold text-brand-pink">Account Management</h1>
      <div className="mt-1 border-b-2 border-brand-pink/40" />
      <div className="mt-6 bg-white rounded-2xl border border-pink-100 shadow-sm p-6 transition-shadow hover:shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center overflow-hidden">
              {profile.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg width="44" height="44" viewBox="0 0 24 24" fill="white" opacity="0.85"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" /></svg>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border-2 border-brand-pink flex items-center justify-center cursor-pointer hover:bg-brand-tint transition-colors shadow-sm">
              {uploadingAvatar ? <span className="text-[9px] text-brand-pink">...</span> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-pink"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" /></svg>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">{profile.full_name || "Superadmin"}</h2>
                <span className="mt-1 inline-block text-xs font-semibold px-3 py-1 rounded-full bg-brand-tint text-brand-pink">{profile.role === "superadmin" ? "Super Admin" : profile.role === "admin" ? "Staff" : profile.role}</span>
              </div>
              {!editMode && <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 border-2 border-brand-pink text-brand-pink font-semibold text-sm px-4 py-1.5 rounded-full hover:bg-brand-pink hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>Edit Profile</button>}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-pink-50">
              <div><p className="text-xs text-zinc-400">Employee ID</p><p className="mt-0.5 text-sm font-semibold text-zinc-800">{profile.employee_id ?? "—"}</p></div>
              <div>
                <p className="text-xs text-zinc-400">Username</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-800 break-all">{profile.username ?? "—"}</p>
                {profile.role === "superadmin" && <button type="button" onClick={openUsernameEditor} className="mt-1 text-xs font-semibold text-brand-pink underline underline-offset-2">Change username</button>}
              </div>
              <div><p className="text-xs text-zinc-400">Status</p><p className="mt-0.5 text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</p></div>
              <div><p className="text-xs text-zinc-400">Member Since</p><p className="mt-0.5 text-sm font-semibold text-zinc-800">{new Date(profile.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-pink-100 shadow-sm p-6 transition-shadow hover:shadow-md">
          <h3 className="flex items-center gap-2 font-bold text-brand-pink"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" /></svg>Personal Information</h3>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="text-sm font-semibold text-zinc-600">First Name</label><input disabled={!editMode} value={form.firstName} onChange={(e) => update("firstName", e.target.value)} className={inputClass(!editMode)} /></div>
            <div><label className="text-sm font-semibold text-zinc-600">Middle Name</label><input disabled={!editMode} value={form.middleName} onChange={(e) => update("middleName", e.target.value)} className={inputClass(!editMode)} /></div>
            <div><label className="text-sm font-semibold text-zinc-600">Last Name</label><input disabled={!editMode} value={form.lastName} onChange={(e) => update("lastName", e.target.value)} className={inputClass(!editMode)} /></div>
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold text-zinc-600">Date of Birth</label><input type="date" disabled={!editMode} value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className={inputClass(!editMode)} /></div>
            <div><label className="text-sm font-semibold text-zinc-600">Phone Number</label><input disabled={!editMode} value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} placeholder="09171234567" className={inputClass(!editMode)} /></div>
          </div>
          <div className="mt-4"><label className="text-sm font-semibold text-zinc-600">Email Address</label><input type="email" disabled={!editMode} value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass(!editMode)} /></div>
          <div className="mt-4"><label className="text-sm font-semibold text-zinc-600">Address</label><textarea disabled={!editMode} value={form.address} onChange={(e) => update("address", e.target.value)} rows={2} className={`${inputClass(!editMode)} resize-none`} /></div>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 transition-shadow hover:shadow-md">
          <h3 className="flex items-center gap-2 font-bold text-brand-pink"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" /></svg>Security</h3>
          <div className="mt-4"><label className="text-sm font-semibold text-zinc-600">Password</label><input disabled value="••••••••••••" className={inputClass(true)} /><button onClick={() => setPasswordModalOpen(true)} className="mt-2 w-full flex items-center justify-center gap-1.5 border-2 border-brand-pink text-brand-pink font-semibold text-sm py-2 rounded-full hover:bg-brand-pink hover:text-white transition-colors"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" /></svg>Change Password</button></div>
          <div className="mt-5 pt-4 border-t border-pink-50"><p className="text-xs text-zinc-400">Last Password Change</p><p className="mt-0.5 text-sm font-semibold text-zinc-800">{profile.password_changed_at ? new Date(profile.password_changed_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Never changed"}</p></div>
          <div className="mt-5 pt-4 border-t border-pink-50"><label className="text-sm font-semibold text-zinc-600">Recovery Email (Optional)</label><input disabled={!editMode} value={form.recoveryEmail} onChange={(e) => update("recoveryEmail", e.target.value)} placeholder="Enter recovery email" className={inputClass(!editMode)} /><div className="mt-3 bg-brand-tint rounded-lg px-3 py-2.5 flex gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-pink shrink-0 mt-0.5"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" /></svg><p className="text-[11px] text-zinc-600">A recovery email helps you reset your password if you ever forget it.</p></div></div>
        </div>
      </div>
      {editMode && <div className="mt-5 bg-white rounded-2xl border border-pink-100 shadow-sm p-4 flex justify-end gap-3"><button onClick={handleCancel} disabled={saving} className="border-2 border-zinc-300 text-zinc-500 font-semibold text-sm px-6 py-2.5 rounded-full hover:border-zinc-400 transition-colors">Cancel</button><button onClick={() => void handleSave()} disabled={saving} className="flex items-center gap-1.5 bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-full transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>{saving ? "Saving..." : "Save Changes"}</button></div>}
      {passwordModalOpen && <ChangePasswordModal onClose={() => setPasswordModalOpen(false)} onChanged={load} />}
      {usernameOpen && profile.role === "superadmin" && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !usernameSaving) setUsernameOpen(false); }}>
          <form role="dialog" aria-modal="true" aria-labelledby="username-heading" onSubmit={(e) => { e.preventDefault(); void saveUsername(); }} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <h3 id="username-heading" className="text-lg font-bold text-brand-pink">Change Super Admin Username</h3>
            <p className="mt-2 text-sm text-zinc-600">Your login username will change. Your email, password, account role and records stay the same.</p>
            <label htmlFor="new-superadmin-username" className="mt-4 block text-sm font-semibold text-zinc-700">New username</label>
            <input id="new-superadmin-username" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={20} minLength={3} required value={usernameDraft} onChange={(e) => { setUsernameDraft(e.target.value); setUsernameError(null); }} disabled={usernameSaving} className="mt-2 w-full rounded-xl border border-pink-200 px-4 py-3 text-sm outline-none focus:border-brand-pink" />
            <p className="mt-2 text-xs text-zinc-500">3–20 characters. Letters, numbers, periods and underscores only.</p>
            {usernameError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{usernameError}</p>}
            <div className="mt-5 flex justify-end gap-3"><button type="button" disabled={usernameSaving} onClick={() => setUsernameOpen(false)} className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-semibold disabled:opacity-50">Cancel</button><button type="submit" disabled={usernameSaving || !usernameDraft.trim()} className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{usernameSaving ? "Saving..." : "Save Username"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return <ToastProvider><ProfilePageInner /></ToastProvider>;
}
