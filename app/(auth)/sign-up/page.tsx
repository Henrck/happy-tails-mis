"use client";
// Real sign-up form. Creates the auth user; the database trigger from
// 001_profiles_and_roles.sql automatically creates a matching `profiles`
// row with role "customer". Depending on your Supabase project's email
// settings, the user may need to confirm their email before they can sign
// in — this form shows a clear message either way rather than silently
// leaving them stuck.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If Supabase's "Confirm email" setting is ON (the default), `session`
    // will be null here even though the account was created — the user
    // must click a link in their email before they can sign in.
    // If it's OFF, `session` will be set and we can send them straight in.
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
          We sent a confirmation link to <strong>{email}</strong>. Click it
          to activate your account, then come back and sign in.
        </p>
        <a
          href="/sign-in"
          className="mt-6 inline-block bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold px-6 py-2.5 rounded-full transition-colors"
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      <h1 className="text-2xl font-bold text-zinc-900 text-center">Create Account</h1>
      <p className="mt-1 text-sm text-zinc-500 text-center">
        Join Happy Tails
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
          <p className="mt-1 text-xs text-zinc-400">At least 6 characters</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-pink hover:bg-brand-pink-dark disabled:opacity-60 text-white font-semibold py-2.5 rounded-full transition-colors"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <a href="/sign-in" className="hover:text-brand-pink font-medium">Sign In</a>
      </div>
    </div>
  );
}
