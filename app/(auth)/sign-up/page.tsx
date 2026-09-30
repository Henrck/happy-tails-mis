"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isUsernameTaken, validateUsernameFormat } from "@/lib/supabase/customer-auth";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const passwordIsValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9\s]/.test(password);

  useEffect(() => {
    if (!username) { setUsernameStatus("idle"); return; }
    const formatError = validateUsernameFormat(username);
    if (formatError) { setUsernameStatus("invalid"); return; }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      const { taken, error: checkError } = await isUsernameTaken(username);
      if (checkError) { setUsernameStatus("idle"); return; }
      setUsernameStatus(taken ? "taken" : "available");
    }, 400);
    return () => clearTimeout(timeout);
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formatError = validateUsernameFormat(username);
    if (formatError) { setError(formatError); return; }
    if (usernameStatus === "taken") { setError("That username is already taken."); return; }
    if (!passwordIsValid) {
      setError("Password must be at least 8 characters and include uppercase, lowercase, and a special character.");
      return;
    }

    setLoading(true);

    const { taken, error: checkError } = await isUsernameTaken(username);
    if (checkError) {
      setLoading(false);
      setError(`Couldn't verify username availability: ${checkError}`);
      return;
    }
    if (taken) {
      setLoading(false);
      setError("That username was just taken — please choose another.");
      setUsernameStatus("taken");
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, username } },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setLoading(false);
      setError("An account with this email already exists. If you didn't receive a confirmation email, try signing in, or use \"Forgot password\" to regain access.");
      return;
    }

    if (data.user) {
      const res = await fetch("/api/auth/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id, username }),
      });
      const result = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(`Account created, but saving the username failed: ${result.error}`);
        return;
      }
    }

    setLoading(false);

    if (data.session) {
      router.push("/account");
      router.refresh();
    } else {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Check your email</h1>
        <p className="mt-3 text-sm text-zinc-600">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
        </p>
        <a href="/sign-in" className="mt-6 inline-block bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors">Go to Sign In</a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h1 className="text-2xl font-bold text-zinc-900 text-center">Create Account</h1>
      <p className="mt-1 text-sm text-zinc-500 text-center">Join Happy Tails</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">Full Name</label>
          <input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-zinc-700">Username</label>
          <input id="username" type="text" required autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          {usernameStatus === "checking" && <p className="mt-1 text-xs text-zinc-400">Checking availability…</p>}
          {usernameStatus === "available" && <p className="mt-1 text-xs text-emerald-600">Username available</p>}
          {usernameStatus === "taken" && <p className="mt-1 text-xs text-red-600">Username already taken</p>}
          {usernameStatus === "invalid" && username && <p className="mt-1 text-xs text-red-600">{validateUsernameFormat(username)}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">Password</label>
          <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink" />
          <div className="mt-2 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2.5">
            <p className="text-xs font-medium text-zinc-600 mb-1.5">Password requirements</p>
            <ul className="space-y-1 text-xs text-zinc-500">
              <li className={password.length >= 8 ? "text-emerald-600" : ""}>• At least 8 characters</li>
              <li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>• At least one uppercase letter</li>
              <li className={/[a-z]/.test(password) ? "text-emerald-600" : ""}>• At least one lowercase letter</li>
              <li className={/[^A-Za-z0-9\s]/.test(password) ? "text-emerald-600" : ""}>• At least one special character</li>
            </ul>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button type="submit" disabled={loading} className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-full transition-colors">
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-zinc-500">
        Already have an account? <a href="/sign-in" className="hover:text-brand-pink font-medium">Sign In</a>
      </div>
    </div>
  );
}
