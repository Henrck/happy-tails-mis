"use client";
// Real sign-in form. On success, checks the user's role in `profiles` and
// redirects accordingly: superadmin -> /admin, everyone else (customer,
// and eventually admin/staff once that's built) -> /account.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
      // Shouldn't normally happen — the trigger creates a profile on
      // signup — but fail safe to the customer side rather than admin.
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
