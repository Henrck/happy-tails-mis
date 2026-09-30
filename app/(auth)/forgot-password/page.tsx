"use client";

import { useState } from "react";

type Step = "email" | "code" | "password";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "At least one uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "At least one lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "At least one special character", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1.5 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const valid = rule.test(password);
        return (
          <li key={rule.label} className={valid ? "text-emerald-600" : "text-zinc-400"}>
            <span aria-hidden="true" className="mr-1.5">{valid ? "✓" : "•"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<{ error?: string; message?: string; ok?: boolean }>;
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const passwordValid = PASSWORD_RULES.every((rule) => rule.test(password));
  const passwordsMatch = password === confirmation;

  function clearFeedback() {
    setError(null);
    setMessage(null);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const result = await readJson(response);

      if (!response.ok) {
        setError(result.error ?? "We couldn't send a verification code.");
        return;
      }

      setEmail(normalizedEmail);
      setStep("code");
      setMessage(result.message ?? "A verification code has been sent to your email.");
    } catch {
      setError("We couldn't connect to the password reset service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await readJson(response);

      if (!response.ok) {
        setError(result.error ?? "That code is invalid or has expired.");
        return;
      }

      setStep("password");
      setMessage("Email verified. You can now create a new password.");
    } catch {
      setError("We couldn't verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    clearFeedback();

    if (!passwordValid) {
      setError("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await readJson(response);

      if (!response.ok) {
        setError(result.error ?? "We couldn't change your password.");
        return;
      }

      setMessage(result.message ?? "Your password has been changed successfully. You can now sign in.");
      setStep("email");
      setCode("");
      setPassword("");
      setConfirmation("");
    } catch {
      setError("We couldn't change your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      {step === "email" && (
        <>
          <h1 className="text-center text-2xl font-bold text-zinc-900">Reset Your Password</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">Enter your email and we&apos;ll send you a 6-digit verification code.</p>
          <form onSubmit={sendCode} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700">Email</label>
              <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" placeholder="you@example.com" />
            </div>
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:opacity-60">{loading ? "Sending code..." : "Send Verification Code"}</button>
            <div className="text-center text-sm text-zinc-500"><a href="/sign-in" className="hover:text-brand-pink">Back to Sign In</a></div>
          </form>
        </>
      )}

      {step === "code" && (
        <>
          <h1 className="text-center text-2xl font-bold text-zinc-900">Verify Your Email</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">Enter the 6-digit code sent to <strong className="break-all text-zinc-700">{email}</strong>.</p>
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-code" className="block text-sm font-medium text-zinc-700">Verification Code</label>
              <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-3 text-center text-xl tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-brand-pink" placeholder="000000" />
            </div>
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:opacity-60">{loading ? "Verifying..." : "Verify Code"}</button>
            <button type="button" onClick={() => { setStep("email"); setCode(""); clearFeedback(); }} className="w-full text-sm text-zinc-500 transition-colors hover:text-brand-pink">Request a new code</button>
          </form>
        </>
      )}

      {step === "password" && (
        <>
          <h1 className="text-center text-2xl font-bold text-zinc-900">Create New Password</h1>
          <p className="mt-2 text-center text-sm text-zinc-500">Your email has been verified. Choose a new password for your account.</p>
          <form onSubmit={updatePassword} className="mt-6 space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-zinc-700">New Password</label>
              <div className="relative mt-1">
                <input id="new-password" type={showPassword ? "text" : "password"} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-xs text-zinc-500 hover:text-zinc-800" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </div>
              <PasswordRules password={password} />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-700">Confirm New Password</label>
              <div className="relative mt-1">
                <input id="confirm-password" type={showConfirmation ? "text" : "password"} required autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
                <button type="button" onClick={() => setShowConfirmation((value) => !value)} className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-xs text-zinc-500 hover:text-zinc-800" aria-label={showConfirmation ? "Hide password confirmation" : "Show password confirmation"}>{showConfirmation ? "Hide" : "Show"}</button>
              </div>
              {confirmation && <p className={`mt-1 text-xs ${passwordsMatch ? "text-emerald-600" : "text-red-600"}`}>{passwordsMatch ? "Passwords match." : "Passwords do not match."}</p>}
            </div>
            {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading || !passwordValid || !passwordsMatch} className="w-full rounded-full bg-brand-pink py-2.5 font-semibold text-white transition-colors hover:bg-brand-pink-dark disabled:opacity-60">{loading ? "Updating Password..." : "Change Password"}</button>
          </form>
        </>
      )}
    </div>
  );
}
