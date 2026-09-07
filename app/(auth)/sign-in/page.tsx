"use client";
// Real sign-in form. Accepts either a username or an email in one
// field — Supabase Auth itself only understands email, so a typed
// username gets resolved to its real email first (via the narrow
// email_for_username RPC, safe to call before login — see migration
// 030), then signs in normally with that email. On success, checks the
// user's role in `profiles` and redirects: superadmin -> /admin,
// everyone else -> /account.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveEmailForLogin } from "@/lib/supabase/customer-auth";

export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { email, error: resolveError } = await resolveEmailForLogin(identifier.trim());
    if (resolveError || !email) {
      setError(resolveError ?? "Couldn't find that account.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !data.user) {
      setError(signInError?.message ?? "Something went wrong signing in.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      router.push("/account");
      return;
    }

    router.push(profile.role === "superadmin" ? "/admin" : "/account");
    router.refresh();
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
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
          />
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
