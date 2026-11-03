"use client";

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, PawPrint, Phone, UserRound, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasValidCustomerPhone, normalizeCustomerPhone } from "@/lib/utils/customer-phone";
import { isUsernameTaken, validateUsernameFormat } from "@/lib/supabase/customer-auth";

type Props = { landscapeUrl: string; portraitUrl: string; customPortrait: boolean };
type Stage = "details" | "verify";
const CODE_LENGTH = 6;
const RESEND_SECONDS = 60;
const PENDING_EMAIL_KEY = "happytails-signup-pending-email";

const passwordChecks = (password: string) => ({
  length: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  special: /[^A-Za-z0-9\s]/.test(password),
});

export default function HappyTailsSignup({ landscapeUrl, portraitUrl, customPortrait }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [stage, setStage] = useState<Stage>("details");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);

  useEffect(() => {
    // Keep just the pending email to allow re-requesting an OTP after a refresh.
    // Do not persist the password or an authentication session in localStorage.
    try {
      const pending = sessionStorage.getItem(PENDING_EMAIL_KEY);
      if (pending && /^\S+@\S+\.\S+$/.test(pending)) {
        setEmail(pending);
        setStage("verify");
      }
    } catch { /* storage is optional */ }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const checks = passwordChecks(password);
  const validPassword = Object.values(checks).every(Boolean);
  const backgroundVars = {
    "--ht-recovery-landscape": `url(${JSON.stringify(landscapeUrl)})`,
    "--ht-recovery-portrait": `url(${JSON.stringify(portraitUrl)})`,
  } as CSSProperties;

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    const normalizedName = fullName.trim().replace(/\s+/g, " ");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();
    const normalizedPhone = normalizeCustomerPhone(phone);
    if (normalizedName.length < 2 || normalizedName.length > 120) {
      setError("Enter your full name (2–120 characters)."); return;
    }
    const usernameError = validateUsernameFormat(normalizedUsername);
    if (usernameError) { setError(usernameError); return; }
    if (!hasValidCustomerPhone(normalizedPhone)) {
      setError("Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX."); return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      setError("Enter a valid email address."); return;
    }
    if (!validPassword || password.length > 1024) {
      setError("Use at least 8 characters, with uppercase, lowercase, and a special character."); return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match."); return;
    }
    setBusy(true);
    try {
      // This endpoint checks customer and staff usernames without exposing account emails.
      const availability = await isUsernameTaken(normalizedUsername);
      if (availability.error) { setError(availability.error); return; }
      if (availability.taken) { setError("That username is already taken. Choose another username."); return; }
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: normalizedName,
            username: normalizedUsername,
            phone_number: normalizedPhone,
            account_type: "customer",
          },
        },
      });
      if (signupError) { setError(signupError.message); return; }
      if (data.session) {
        // A returned session means email confirmation is disabled in Supabase.
        // Do not treat signup as verified; require the admin to enable it.
        await supabase.auth.signOut();
        setError("Email verification is not enabled for this project. Please contact HappyTails support.");
        return;
      }
      setEmail(normalizedEmail);
      setUsername(normalizedUsername);
      setPhone(normalizedPhone);
      setPassword(""); setConfirmPassword("");
      setCode("");
      setStage("verify");
      setCooldown(RESEND_SECONDS);
      setMessage("If this address can be registered, a 6-digit email verification code has been sent. Check your inbox and spam folder.");
      try { sessionStorage.setItem(PENDING_EMAIL_KEY, normalizedEmail); } catch { /* optional */ }
    } catch {
      setError("Registration is temporarily unavailable. Please try again.");
    } finally { setBusy(false); }
  }

  async function finishVerifiedAccount(userId: string) {
    // Verify the server-backed identity before writing any customer fields.
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user || auth.user.id !== userId || auth.user.email?.toLowerCase() !== email) {
      setError("We could not verify your account session. Please contact support."); return;
    }
    const { data: profile, error: profileError } = await supabase.from("profiles")
      .select("role").eq("id", userId).maybeSingle();
    if (profileError || !profile || profile.role === "admin" || profile.role === "superadmin") {
      setError("Your email is confirmed, but customer account setup could not be verified. Please contact support."); return;
    }
    const updates: { full_name?: string; phone_number?: string; username?: string } = {};
    // First verification uses signup metadata if the page was refreshed.
    const name = fullName.trim() || (typeof auth.user.user_metadata?.full_name === "string" ? auth.user.user_metadata.full_name : "");
    const mobile = normalizeCustomerPhone(phone || (typeof auth.user.user_metadata?.phone_number === "string" ? auth.user.user_metadata.phone_number : ""));
    const selectedUsername = username.trim() || (typeof auth.user.user_metadata?.username === "string" ? auth.user.user_metadata.username.trim() : "");
    if (name.length >= 2) updates.full_name = name;
    if (hasValidCustomerPhone(mobile)) updates.phone_number = mobile;
    if (!validateUsernameFormat(selectedUsername)) updates.username = selectedUsername;
    if (!updates.full_name || !updates.phone_number || !updates.username) {
      setError("Your email is verified, but required account details are missing. Contact HappyTails support."); return;
    }
    // The database's username uniqueness rule is authoritative, including
    // simultaneous signups after both pass the initial availability check.
    const { data: customer, error: customerError } = await supabase.from("customers")
      .update(updates).eq("id", userId).select("id,status,username").maybeSingle();
    if (customerError) {
      setError(customerError.code === "23505"
        ? "That username is now taken. Please contact HappyTails support to choose a new one."
        : "Email verified, but account details could not be saved. Please try again.");
      return;
    }
    if (!customer || customer.status !== "active" || customer.username?.toLowerCase() !== selectedUsername.toLowerCase()) {
      setError("Email verified, but your customer profile could not be completed. Contact support before signing in."); return;
    }
    // Verification signs the customer in temporarily. End that session and
    // follow the requested explicit login step.
    const { error: signoutError } = await supabase.auth.signOut();
    if (signoutError) {
      setError("Your account was verified, but sign-out did not finish. Please refresh and sign out before logging in again."); return;
    }
    try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* optional */ }
    router.replace("/sign-in?verified=1");
    router.refresh();
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(""); setMessage("");
    if (confirmedUserId) {
      setBusy(true);
      try { await finishVerifiedAccount(confirmedUserId); } finally { setBusy(false); }
      return;
    }
    if (!/^\d{6}$/.test(code)) { setError("Enter the 6-digit code from your verification email."); return; }
    setBusy(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email, token: code.trim(), type: "email",
      });
      if (verifyError || !data.user || !data.session) {
        setError(verifyError?.message || "This code is invalid or expired. Request a new code and try again.");
        return;
      }
      setConfirmedUserId(data.user.id);
      await finishVerifiedAccount(data.user.id);
    } catch {
      setError("Unable to verify this code right now. Please try again.");
    } finally { setBusy(false); }
  }

  async function handleResend() {
    if (busy || cooldown > 0) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
      if (resendError) { setError(resendError.message); return; }
      setCode("");
      setCooldown(RESEND_SECONDS);
      setMessage("If verification is still pending, another code has been requested. Use the latest email.");
    } catch { setError("Could not resend the code right now."); }
    finally { setBusy(false); }
  }

  function backToDetails() {
    setStage("details"); setConfirmedUserId(null); setCode(""); setError(""); setMessage("");
    try { sessionStorage.removeItem(PENDING_EMAIL_KEY); } catch { /* optional */ }
  }

  return (
    <div className={`ht-recovery-page ht-signup-page${customPortrait ? " ht-recovery-custom-portrait" : ""}`} style={backgroundVars}>
      <div className="ht-recovery-portrait-top" aria-hidden="true" />
      <div className="ht-recovery-placement">
        <div className="ht-recovery-portrait-middle" aria-hidden="true" />
        <section className="ht-recovery-card ht-signup-card" aria-labelledby="ht-signup-title">
          <header className="ht-recovery-heading">
            <PawPrint className="ht-recovery-paw" fill="currentColor" aria-hidden="true" />
            <h1 id="ht-signup-title">{stage === "details" ? "Create Account" : "Verify Your Email"}</h1>
            <p>{stage === "details" ? "Join the HappyTails family. Create your account using any valid email address." : `Enter the 6-digit verification code sent to ${email}.`}</p>
          </header>
          <div className="ht-recovery-progress" aria-label={`Step ${stage === "details" ? 1 : 2} of 2`}>
            <span className="active" /><span className={stage === "verify" ? "active" : ""} />
          </div>
          {message && <p className="ht-recovery-notice" role="status"><CheckCircle2 size={18} aria-hidden="true" />{message}</p>}
          {error && <p className="ht-recovery-error" role="alert">{error}</p>}

          {stage === "details" ? (
            <form className="ht-recovery-form ht-signup-form" onSubmit={handleSignup}>
              <label className="ht-recovery-label" htmlFor="ht-su-name">Full Name</label>
              <div className="ht-recovery-field"><UserRound aria-hidden="true" /><input id="ht-su-name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" placeholder="Enter your full name" maxLength={120} disabled={busy} required /></div>
              <label className="ht-recovery-label" htmlFor="ht-su-username">Username</label>
              <div className="ht-recovery-field"><UserRound aria-hidden="true" /><input id="ht-su-username" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Choose a unique username" minLength={3} maxLength={20} disabled={busy} required /></div>
              <p className="ht-signup-password-hint">3–20 characters: letters, numbers, underscores, or periods. You can log in using this username or your email.</p>
              <label className="ht-recovery-label" htmlFor="ht-su-phone">Phone Number</label>
              <div className="ht-recovery-field"><Phone aria-hidden="true" /><input id="ht-su-phone" value={phone} onChange={e => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="09XXXXXXXXX or +639XXXXXXXXX" maxLength={20} disabled={busy} required /></div>
              <label className="ht-recovery-label" htmlFor="ht-su-email">Email Address</label>
              <div className="ht-recovery-field"><Mail aria-hidden="true" /><input id="ht-su-email" value={email} onChange={e => setEmail(e.target.value)} type="email" autoComplete="email" autoCapitalize="none" placeholder="Gmail, Yahoo, iCloud, Outlook, etc." maxLength={254} disabled={busy} required /></div>
              <label className="ht-recovery-label" htmlFor="ht-su-password">Password</label>
              <div className="ht-recovery-field"><LockKeyhole aria-hidden="true" /><input id="ht-su-password" value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Create a password" disabled={busy} required /><button type="button" className="ht-recovery-eye" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
              <label className="ht-recovery-label" htmlFor="ht-su-confirm">Confirm Password</label>
              <div className="ht-recovery-field"><ShieldCheck aria-hidden="true" /><input id="ht-su-confirm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" placeholder="Confirm your password" disabled={busy} required /><button type="button" className="ht-recovery-eye" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? "Hide confirmation" : "Show confirmation"}>{showConfirmPassword ? <EyeOff /> : <Eye />}</button></div>
              <p className="ht-signup-password-hint">At least 8 characters, including uppercase, lowercase and a special character.</p>
              <button className="ht-recovery-primary" type="submit" disabled={busy}>{busy ? "Creating account..." : "Create Account"}<ArrowRight aria-hidden="true" size={20} /></button>
            </form>
          ) : (
            <form className="ht-recovery-form" onSubmit={handleVerify}>
              <label className="ht-recovery-label" htmlFor="ht-su-code">Email Verification Code</label>
              <div className="ht-recovery-field"><Mail aria-hidden="true" /><input className="ht-recovery-code" id="ht-su-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))} type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={CODE_LENGTH} placeholder="000000" disabled={busy || !!confirmedUserId} required={!confirmedUserId} /></div>
              <p className="ht-recovery-help">Check your inbox and spam folder. The code is for email confirmation, not password recovery.</p>
              <button className="ht-recovery-primary" type="submit" disabled={busy || (!confirmedUserId && code.length !== CODE_LENGTH)}>{busy ? "Verifying..." : confirmedUserId ? "Complete Account Setup" : "Verify Email"}<ArrowRight aria-hidden="true" size={20} /></button>
              <div className="ht-recovery-actions"><button type="button" disabled={busy || !!confirmedUserId} onClick={backToDetails}>Change email</button><button type="button" disabled={busy || cooldown > 0 || !!confirmedUserId} onClick={() => void handleResend()}>{cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</button></div>
            </form>
          )}
          <Link className="ht-recovery-back" href="/sign-in"><ArrowLeft size={18} aria-hidden="true" /> Back to Log In</Link>
        </section>
      </div>
      <div className="ht-recovery-portrait-bottom" aria-hidden="true" />
    </div>
  );
}
