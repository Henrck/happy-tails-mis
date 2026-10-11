"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveEmailForLogin, validateUsernameFormat } from "@/lib/supabase/customer-auth";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6-3.5 6-9.5 6-3.5-6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 6.2A10.4 10.4 0 0 1 12 6c6 0 9.5 6 9.5 6a18 18 0 0 1-3.1 3.6M6.2 6.7C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1 0 1.9-.2 2.8-.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (searchParams.get("deactivated") === "1") {
      return "This account is inactive or archived. Please contact support.";
    }
    if (searchParams.get("access") === "unverified") {
      return "Your account access could not be verified. Please retry or contact support.";
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { email, error: resolveError } = await resolveEmailForLogin(identifier.trim());
      if (resolveError || !email) {
        setError(resolveError ?? "Couldn't find that account.");
        return;
      }

      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setError(signInError?.message ?? "Something went wrong signing in.");
        return;
      }

      // Never infer a user's access level or account status when a lookup
      // fails. Query only the authoritative table for the verified role.
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError || !profile || typeof profile.role !== "string") {
        await supabase.auth.signOut();
        setError("Your account profile could not be verified. Please contact support.");
        return;
      }

      const isStaff = profile.role === "superadmin" || profile.role === "admin";
      let customerRow: { status: string; username: string | null } | null = null;
      let status: string | null = null;
      let accessVerified = false;

      if (isStaff) {
        const { data: staffRow, error: staffError } = await supabase
          .from("staff_profiles")
          .select("status")
          .eq("id", data.user.id)
          .maybeSingle();
        accessVerified = !staffError && !!staffRow;
        status = staffRow?.status ?? null;
      } else {
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("status, username")
          .eq("id", data.user.id)
          .maybeSingle();
        accessVerified = !customerError && !!customer;
        if (customer) customerRow = customer;
        status = customer?.status ?? null;
      }

      if (!accessVerified) {
        await supabase.auth.signOut();
        setError("Your account status could not be verified. Please retry or contact support.");
        return;
      }

      if (status !== "active") {
        await supabase.auth.signOut();
        setError("This account is inactive or archived. Please contact support.");
        return;
      }

      // SEC-001: preserve recovery of a missing username after first
      // confirmed email login, using the authenticated user's token.
      if (customerRow && !customerRow.username) {
        const pendingUsername = data.user.user_metadata?.username;
        if (
          typeof pendingUsername === "string" &&
          !validateUsernameFormat(pendingUsername.trim())
        ) {
          const accessToken = data.session?.access_token;
          if (!accessToken) {
            setError("Signed in, but a secure session was unavailable. Please try again.");
            return;
          }

          try {
            const usernameResponse = await fetch("/api/auth/set-username", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ username: pendingUsername.trim() }),
            });
            if (!usernameResponse.ok) {
              const result = await usernameResponse
                .json()
                .catch(() => ({ error: "Please retry or contact support." }));
              setError(
                `Account login succeeded, but your username could not be saved: ${result.error ?? "Please retry or contact support."}`
              );
              return;
            }
          } catch {
            setError("Account login succeeded, but the username service is unavailable. Please try again.");
            return;
          }
        }
      }

      router.push(isStaff ? "/admin" : "/account");
      router.refresh();
    } catch {
      setError("Unable to verify your account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h1 className="text-2xl font-bold text-zinc-900 text-center">Sign In</h1>
      <p className="mt-1 text-sm text-zinc-500 text-center">
        Welcome back to Happy Tails
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium text-zinc-700">
            Username or Email
          </label>
          <input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            Password
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-full"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-zinc-500">
        <a href="/forgot-password" className="hover:text-brand-pink">Forgot password?</a>
        <span className="mx-2">·</span>
        <a href="/sign-up" className="hover:text-brand-pink">Create an account</a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
