"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, LockKeyhole, PawPrint, UserRound } from "lucide-react";

type LoginProps = {
  landscapeUrl: string;
  portraitUrl: string;
  customPortrait: boolean;
};

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Google" className="ht-google-icon">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.04 46.98 31.89 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export default function HappyTailsLogin({ landscapeUrl, portraitUrl, customPortrait }: LoginProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only the identifier is remembered, never the password or auth tokens.
    try {
      const saved = window.localStorage.getItem("happytails-last-login");
      if (saved) setIdentifier(saved);
    } catch { /* private-browsing storage can be unavailable */ }
  }, []);

  useEffect(() => {
    if (params.get("deactivated") === "1") {
      setError("This account is inactive or archived. Please contact support.");
    } else if (params.get("access") === "unverified") {
      setError("Your account access could not be verified. Please retry or contact support.");
    } else if (params.get("google_error") === "oauth") {
      setError("Google sign-in could not be completed. Please try again.");
    } else if (params.get("google_error") === "setup") {
      setError("Your Google account was verified, but HappyTails account setup is incomplete. Please contact support.");
    }
  }, [params]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Preserve the EXISTING verified server-side password, role and status checks.
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; redirectTo?: string; error?: string }
        | null;
      if (!response.ok || !result?.ok) {
        setError(result?.error || "Unable to sign in. Please try again.");
        return;
      }
      try {
        if (remember) window.localStorage.setItem("happytails-last-login", identifier.trim());
        else window.localStorage.removeItem("happytails-last-login");
      } catch { /* local storage is optional */ }
      router.replace(result.redirectTo === "/admin" ? "/admin" : "/account");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    if (busy || googleBusy) return;
    setGoogleBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError || !data.url) {
        setError("Unable to start Google sign-in. Please try again.");
        setGoogleBusy(false);
        return;
      }
      // Supabase returns the provider authorization URL. Never embed
      // Google credentials in the frontend or manually handle ID tokens.
      window.location.assign(data.url);
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
      setGoogleBusy(false);
    }
  }

  const backgroundVars = {
    "--ht-landscape": `url(${JSON.stringify(landscapeUrl)})`,
    "--ht-portrait": `url(${JSON.stringify(portraitUrl)})`,
  } as CSSProperties;

  return (
    <div className={`ht-login-page${customPortrait ? " ht-login-custom-portrait" : ""}`} style={backgroundVars}>
      <div className="ht-login-portrait-top" aria-hidden="true" />
      <div className="ht-login-placement">
        <div className="ht-login-portrait-middle" aria-hidden="true" />
        <section className="ht-login-card" aria-labelledby="ht-login-title">
          <header className="ht-login-heading">
            <PawPrint className="ht-login-paw" fill="currentColor" aria-hidden="true" />
            <h1 id="ht-login-title">Log In</h1>
            <p>Welcome back! Please login to your account.</p>
          </header>

          <form className="ht-login-form" onSubmit={handleSubmit}>
            <div className="ht-login-field">
              <UserRound className="ht-login-field-icon" strokeWidth={2.7} aria-hidden="true" />
              <label className="sr-only" htmlFor="ht-identifier">Email or Username</label>
              <input
                id="ht-identifier"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                type="text"
                name="identifier"
                maxLength={254}
                placeholder="Email or Username"
                required
                disabled={busy}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </div>

            <div className="ht-login-field">
              <LockKeyhole className="ht-login-field-icon" fill="currentColor" strokeWidth={2} aria-hidden="true" />
              <label className="sr-only" htmlFor="ht-password">Password</label>
              <input
                id="ht-password"
                type={visible ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Password"
                required
                disabled={busy}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="ht-login-password-toggle"
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
              </button>
            </div>

            <div className="ht-login-options">
              <label className="ht-login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={busy}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {error && <p role="alert" className="ht-login-error">{error}</p>}
            <button type="submit" className="ht-login-submit" disabled={busy}>
              <span>{busy ? "Signing in..." : "Log In"}</span>
              {!busy && <ArrowRight aria-hidden="true" />}
            </button>
          </form>

          <div className="ht-login-divider"><span>Or continue with</span></div>
          <button
            type="button"
            className="ht-login-google"
            disabled={busy || googleBusy}
            onClick={handleGoogleSignIn}
            aria-label="Continue with Google"
          >
            <GoogleG /> <span>{googleBusy ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>
        </section>
      </div>
      <div className="ht-login-portrait-bottom" aria-hidden="true" />
    </div>
  );
}
