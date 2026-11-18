"use client";
// "Sign-in details" on My Account: choose or change a username, and set a
// password (Google accounts have none) or change an existing one.
import { useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validateUsernameFormat } from "@/lib/supabase/customer-auth";

// Same password rules as customer sign-up.
const passwordChecks = (password: string) => [
  { label: "At least 8 characters", ok: password.length >= 8 },
  { label: "An uppercase letter", ok: /[A-Z]/.test(password) },
  { label: "A lowercase letter", ok: /[a-z]/.test(password) },
  { label: "A special character", ok: /[^A-Za-z0-9\s]/.test(password) },
];
const input = "w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-brand-pink";

type Note = { ok: boolean; text: string } | null;

export default function SignInDetails({ username, onUsernameSaved }: { username: string | null; onUsernameSaved: (username: string) => void }) {
  const [name, setName] = useState(username ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameNote, setNameNote] = useState<Note>(null);

  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNote, setPasswordNote] = useState<Note>(null);

  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(({ data: { user } }) => {
      if (!active || !user) return;
      const providers = (user.identities ?? []).map((identity) => identity.provider);
      setGoogleLinked(providers.includes("google"));
      // Email sign-ups have an "email" identity; Google accounts that set a
      // password here are marked in their metadata.
      setHasPassword(providers.includes("email") || user.user_metadata?.password_set === true);
    });
    return () => { active = false; };
  }, []);

  async function saveUsername(event: FormEvent) {
    event.preventDefault();
    const value = name.trim();
    const formatError = validateUsernameFormat(value);
    if (formatError) { setNameNote({ ok: false, text: formatError }); return; }
    if (value === (username ?? "")) { setNameNote({ ok: true, text: "That is already your username." }); return; }
    setSavingName(true); setNameNote(null);
    try {
      const response = await fetch("/api/auth/set-username", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ username: value }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Unable to save your username.");
      onUsernameSaved(value);
      setNameNote({ ok: true, text: "Username saved." });
    } catch (error) {
      setNameNote({ ok: false, text: error instanceof Error ? error.message : "Unable to save your username." });
    } finally { setSavingName(false); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (!passwordChecks(next).every((check) => check.ok)) { setPasswordNote({ ok: false, text: "The new password doesn't meet all the requirements." }); return; }
    if (next !== confirm) { setPasswordNote({ ok: false, text: "The passwords don't match." }); return; }
    setSavingPassword(true); setPasswordNote(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Please sign in again.");
      if (hasPassword) {
        // Changing an existing password: confirm the current one first.
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
        if (verifyError) throw new Error("Your current password is incorrect.");
      }
      const { error } = await supabase.auth.updateUser({ password: next, data: { password_set: true } });
      if (error) {
        throw new Error(/reauthenticat|recent/i.test(error.message)
          ? "For security, please sign out, sign in again with Google, and then set your password."
          : error.message);
      }
      setPasswordNote({ ok: true, text: hasPassword ? "Password changed." : "Password set. You can now also sign in with your email or username and this password." });
      setHasPassword(true); setCurrent(""); setNext(""); setConfirm("");
    } catch (error) {
      setPasswordNote({ ok: false, text: error instanceof Error ? error.message : "Unable to save your password." });
    } finally { setSavingPassword(false); }
  }

  const checks = passwordChecks(next);
  const noteClass = (note: Note) => `text-sm ${note?.ok ? "text-green-600" : "text-red-600"}`;

  return <section className="rounded-3xl border border-pink-100 bg-white p-6 md:p-8">
    <h2 className="text-lg font-bold text-zinc-800">Sign-in details</h2>
    <p className="mt-1 text-sm text-zinc-500">{googleLinked ? "Your account is connected to Google. " : ""}You can sign in with your email or username and your password.</p>

    <form onSubmit={saveUsername} className="mt-6">
      <label htmlFor="account-username" className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-zinc-700"><UserRound size={16} className="text-brand-pink" /> Username</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input id="account-username" value={name} onChange={(event) => setName(event.target.value)} maxLength={20} autoComplete="username" autoCapitalize="none" spellCheck={false}
          placeholder="Choose a username" className={input} />
        <button type="submit" disabled={savingName || !name.trim()} className="shrink-0 rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{savingName ? "Saving…" : username ? "Change username" : "Save username"}</button>
      </div>
      <p className="mt-1 text-xs text-zinc-500">3–20 characters: letters, numbers, underscores or periods.</p>
      {nameNote && <p role="status" className={`mt-2 ${noteClass(nameNote)}`}>{nameNote.text}</p>}
    </form>

    <form onSubmit={savePassword} className="mt-8 border-t border-pink-100 pt-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-700"><KeyRound size={16} className="text-brand-pink" /> {hasPassword === false ? "Set a password" : "Change password"}</h3>
      {hasPassword === false && <p className="mt-1 text-xs text-zinc-500">You signed up with Google, so your account has no password yet. Set one to also sign in with your email or username.</p>}
      {hasPassword !== null && <div className="mt-4 grid gap-4 md:grid-cols-2">
        {hasPassword && <label className="md:col-span-2"><span className="mb-1.5 block text-sm text-zinc-600">Current password</span>
          <input type={show ? "text" : "password"} value={current} onChange={(event) => setCurrent(event.target.value)} autoComplete="current-password" required className={input} /></label>}
        <label><span className="mb-1.5 block text-sm text-zinc-600">New password</span>
          <input type={show ? "text" : "password"} value={next} onChange={(event) => setNext(event.target.value)} autoComplete="new-password" required className={input} /></label>
        <label><span className="mb-1.5 block text-sm text-zinc-600">Confirm new password</span>
          <input type={show ? "text" : "password"} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" required className={input} /></label>
        <ul className="grid gap-1 text-xs sm:grid-cols-2 md:col-span-2">
          {checks.map((check) => <li key={check.label} className={`flex items-center gap-1.5 ${check.ok ? "text-green-600" : "text-zinc-400"}`}><Check size={13} strokeWidth={3} />{check.label}</li>)}
        </ul>
      </div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setShow((value) => !value)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-800">{show ? <EyeOff size={16} /> : <Eye size={16} />}{show ? "Hide passwords" : "Show passwords"}</button>
        <button type="submit" disabled={savingPassword || hasPassword === null} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{savingPassword ? "Saving…" : hasPassword === false ? "Set password" : "Change password"}</button>
      </div>
      {passwordNote && <p role="status" className={`mt-3 ${noteClass(passwordNote)}`}>{passwordNote.text}</p>}
    </form>
  </section>;
}
