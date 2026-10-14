"use client";

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Eye, EyeOff, KeyRound, LockKeyhole, Mail, PawPrint, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "code" | "password";
type Props = { landscapeUrl: string; portraitUrl: string; customPortrait: boolean };
const RESEND_COOLDOWN_SECONDS = 60;

function validatePassword(password: string) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function ForgotPasswordClient({ landscapeUrl, portraitUrl, customPortrait }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setInterval(() => setResendSeconds(s => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  const passwordRules = validatePassword(password);
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const backgroundVars = {
    "--ht-recovery-landscape": `url(${JSON.stringify(landscapeUrl)})`,
    "--ht-recovery-portrait": `url(${JSON.stringify(portraitUrl)})`,
  } as CSSProperties;

  function clearStatus() { setError(""); setMessage(""); }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (loading || (step === "code" && resendSeconds > 0)) return;
    clearStatus();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (resetError) { setError(resetError.message); return; }
      setEmail(normalizedEmail);
      setCode("");
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setMessage("If an account exists for this email, a verification code has been sent.");
      setStep("code");
    } catch { setError("We couldn't send the code right now. Please try again."); }
    finally { setLoading(false); }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    clearStatus();
    const normalizedCode = code.replace(/\D/g, "");
    if (!/^\d{8}$/.test(normalizedCode)) { setError("Enter the 8-digit verification code."); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: normalizedCode, type: "recovery" });
      if (verifyError) { setError(verifyError.message); return; }
      setMessage("Code verified. You can now create a new password.");
      setPassword(""); setConfirmPassword(""); setStep("password");
    } catch { setError("Verification failed. Please try again."); }
    finally { setLoading(false); }
  }

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    clearStatus();
    if (!passwordValid) { setError("Your new password does not meet all requirements."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setError(updateError.message); return; }
      await supabase.auth.signOut();
      setPassword(""); setConfirmPassword(""); setCode("");
      setPasswordChanged(true);
    } catch { setError("Unable to change your password right now. Please try again."); }
    finally { setLoading(false); }
  }

  const subtitles: Record<Step, string> = {
    email: "Enter your email and we'll send you a verification code.",
    code: "Enter the 8-digit code sent to your email.",
    password: "Create a new password to secure your account.",
  };

  return (
    <div className={`ht-recovery-page${customPortrait ? " ht-recovery-custom-portrait" : ""}`} style={backgroundVars}>
      <div className="ht-recovery-portrait-top" aria-hidden="true" />
      <div className="ht-recovery-placement">
        <div className="ht-recovery-portrait-middle" aria-hidden="true" />
        <section className="ht-recovery-card" aria-labelledby="ht-recovery-title">
          <header className="ht-recovery-heading">
            <PawPrint className="ht-recovery-paw" fill="currentColor" aria-hidden="true" />
            <h1 id="ht-recovery-title">{step === "email" ? "Forgot Password?" : step === "code" ? "Verify Your Code" : "New Password"}</h1>
            <p>{subtitles[step]}</p>
          </header>
          <div className="ht-recovery-progress" aria-label={`Step ${step === "email" ? 1 : step === "code" ? 2 : 3} of 3`}>
            {(["email", "code", "password"] as const).map((s, index) => <span key={s} className={index <= (["email", "code", "password"] as const).indexOf(step) ? "active" : ""} />)}
          </div>

          {message && <p className="ht-recovery-notice" role="status"><CircleCheck size={19} aria-hidden="true" />{message}</p>}
          {error && <p className="ht-recovery-error" role="alert">{error}</p>}

          {step === "email" && <form onSubmit={sendCode} className="ht-recovery-form">
            <label className="ht-recovery-label" htmlFor="ht-reset-email">Email Address</label>
            <div className="ht-recovery-field"><Mail aria-hidden="true" /><input id="ht-reset-email" type="email" autoComplete="email" inputMode="email" placeholder="Enter your email address" required disabled={loading} value={email} onChange={e => setEmail(e.target.value)} /></div>
            <button className="ht-recovery-primary" type="submit" disabled={loading}>{loading ? "Sending code..." : "Send Verification Code"}<ArrowRight aria-hidden="true" size={22} /></button>
          </form>}

          {step === "code" && <form onSubmit={verifyCode} className="ht-recovery-form">
            <label className="ht-recovery-label" htmlFor="ht-reset-code">Verification Code</label>
            <div className="ht-recovery-field"><KeyRound aria-hidden="true" /><input className="ht-recovery-code" id="ht-reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={8} placeholder="00000000" required disabled={loading} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
            <p className="ht-recovery-help">Check the inbox for <strong>{email}</strong>.</p>
            <button className="ht-recovery-primary" type="submit" disabled={loading || code.length !== 8}>{loading ? "Verifying..." : "Verify Code"}<ArrowRight aria-hidden="true" size={22} /></button>
            <div className="ht-recovery-actions"><button type="button" disabled={loading} onClick={() => { clearStatus(); setStep("email"); }}>Change email</button><button type="button" disabled={loading || resendSeconds > 0} onClick={() => void sendCode()}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}</button></div>
          </form>}

          {step === "password" && <form onSubmit={updatePassword} className="ht-recovery-form">
            <label className="ht-recovery-label" htmlFor="ht-new-password">New Password</label>
            <div className="ht-recovery-field"><LockKeyhole aria-hidden="true" /><input id="ht-new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Enter new password" required disabled={loading} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="ht-recovery-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide new password" : "Show new password"}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
            <label className="ht-recovery-label" htmlFor="ht-confirm-password">Confirm New Password</label>
            <div className="ht-recovery-field"><ShieldCheck aria-hidden="true" /><input id="ht-confirm-password" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="Confirm new password" required disabled={loading} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /><button type="button" className="ht-recovery-eye" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}>{showConfirm ? <EyeOff /> : <Eye />}</button></div>
            <div className="ht-recovery-requirements"><strong>Password requirements</strong>{Object.entries({ length: "At least 8 characters", uppercase: "One uppercase letter", lowercase: "One lowercase letter", special: "One special character" }).map(([key, label]) => <div key={key} className={passwordRules[key as keyof typeof passwordRules] ? "met" : ""}><Check size={15} aria-hidden="true" />{label}</div>)}</div>
            <button className="ht-recovery-primary" type="submit" disabled={loading || !passwordValid || !passwordsMatch}>{loading ? "Updating password..." : "Change Password"}<ArrowRight aria-hidden="true" size={22} /></button>
          </form>}

          <Link className="ht-recovery-back" href="/sign-in"><ArrowLeft size={18} aria-hidden="true" /> Back to Log In</Link>
        </section>
      </div>
      <div className="ht-recovery-portrait-bottom" aria-hidden="true" />

      {passwordChanged && <div className="ht-recovery-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ht-reset-done-title"><div className="ht-recovery-modal"><CircleCheck size={56} className="ht-recovery-success-icon" aria-hidden="true"/><h2 id="ht-reset-done-title">Password Changed!</h2><p>Your password has been updated successfully. You can now sign in with your new password.</p><button className="ht-recovery-primary" type="button" onClick={() => router.replace("/sign-in")}>Continue to Log In <ArrowRight size={20} /></button></div></div>}
    </div>
  );
}
