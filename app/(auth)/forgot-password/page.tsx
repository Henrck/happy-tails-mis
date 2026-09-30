"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code" | "password";

const RESEND_COOLDOWN_SECONDS = 60;

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const passwordRules = validatePassword(password);
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch =
    password.length > 0 && password === confirmPassword;

  function clearStatus() {
    setError("");
    setMessage("");
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    clearStatus();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(normalizedEmail);

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setEmail(normalizedEmail);
    setCode("");
    setResendSeconds(RESEND_COOLDOWN_SECONDS);
    setMessage("If an account exists for this email, a verification code has been sent.");
    setStep("code");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    clearStatus();

    const normalizedCode = code.replace(/\D/g, "");

    if (!/^\d{8}$/.test(normalizedCode)) {
      setError("Enter the 8-digit verification code.");
      return;
    }

    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: normalizedCode,
      type: "recovery",
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setMessage("Code verified. You can now create a new password.");
    setPassword("");
    setConfirmPassword("");
    setStep("password");
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    clearStatus();

    if (!passwordValid) {
      setError("Your new password does not meet all requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();

    setLoading(false);
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setPasswordChanged(true);
  }

  function handleCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, 8));
  }

  return (
    <main className="min-h-screen min-h-[100dvh] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              Forgot Password
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {step === "email" &&
                "Enter your email and we'll send you a verification code."}
              {step === "code" &&
                "Enter the 8-digit code sent to your email."}
              {step === "password" &&
                "Create your new password and confirm it below."}
            </p>
          </div>

          {message && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={sendCode} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-pink-600 px-4 py-3 font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending code..." : "Send verification code"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={verifyCode} className="space-y-5">
              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Verification code
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  placeholder="00000000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-4 text-center text-2xl font-semibold tracking-[0.3em] text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  disabled={loading}
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  Check your Gmail inbox for the 8-digit code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 8}
                className="w-full rounded-lg bg-pink-600 px-4 py-3 font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify code"}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    clearStatus();
                    setStep("email");
                  }}
                  className="text-gray-600 hover:text-gray-900"
                  disabled={loading}
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={() => sendCode()}
                  disabled={loading || resendSeconds > 0}
                  className="font-medium text-pink-600 hover:text-pink-700 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  {resendSeconds > 0
                    ? `Resend in ${resendSeconds}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {passwordChanged && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="password-changed-title"
            >
              <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl sm:p-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg
                    aria-hidden="true"
                    className="h-7 w-7 text-green-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <h2
                  id="password-changed-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Password completely changed
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Your password has been successfully updated. You can now sign
                  in using your new password.
                </p>

                <button
                  type="button"
                  onClick={() => router.replace("/sign-in")}
                  className="mt-6 w-full rounded-lg bg-pink-600 px-4 py-3 font-medium text-white transition hover:bg-pink-700"
                >
                  Continue to Sign In
                </button>
              </div>
            </div>
          )}

          {step === "password" && (
            <form onSubmit={updatePassword} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-pink-500 focus:ring-2 focus:ring-pink-100"
                  disabled={loading}
                  required
                />
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <p className="mb-2 font-medium text-gray-700">
                  Password requirements
                </p>
                <ul className="space-y-1 text-gray-500">
                  <li className={passwordRules.length ? "text-green-600" : ""}>
                    • At least 8 characters
                  </li>
                  <li className={passwordRules.uppercase ? "text-green-600" : ""}>
                    • At least one uppercase letter
                  </li>
                  <li className={passwordRules.lowercase ? "text-green-600" : ""}>
                    • At least one lowercase letter
                  </li>
                  <li className={passwordRules.special ? "text-green-600" : ""}>
                    • At least one special character
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || !passwordValid || !passwordsMatch}
                className="w-full rounded-lg bg-pink-600 px-4 py-3 font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Changing password..." : "Change password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
