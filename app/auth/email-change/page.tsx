"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type ConfirmationState = "checking" | "confirmed" | "pending" | "error";

/** Supabase processes its ConfirmationURL first and then redirects here.
 * We verify the resulting Auth user state instead of treating a redirect as proof.
 */
export default function EmailChangePage() {
  const [state, setState] = useState<ConfirmationState>("checking");
  const [message, setMessage] = useState("Checking your email confirmation…");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const inspect = async () => {
      const search = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const errorMessage = search.get("error_description") || fragment.get("error_description");
      if (errorMessage || search.has("error") || fragment.has("error")) {
        if (active) {
          setState("error");
          setMessage(errorMessage || "The confirmation link has expired or is invalid. Request a new email change from Account Management.");
        }
        return;
      }

      try {
        // Supabase's browser client recovers the session returned in the
        // confirmation URL where applicable; getUser then retrieves the
        // authoritative, latest email from Supabase Auth.
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!active) return;
        if (error || !user) {
          setState("pending");
          setMessage("Your link was opened, but we cannot verify the updated email in this browser. Sign in again and check Account Management. If secure email change is enabled, approve the links sent to both email addresses.");
          return;
        }
        setEmail(user.email || "");
        const pendingEmail = user.new_email;
        if (pendingEmail && pendingEmail.toLowerCase() !== (user.email || "").toLowerCase()) {
          setState("pending");
          setMessage(`Email change still pending for ${pendingEmail}. If Secure Email Change is enabled, confirm the emails sent to both your old and new addresses.`);
          return;
        }
        // No pending email doesn't prove this link just made a change. A
        // signed-in user may have landed here without any confirmation.
        setState("confirmed");
        setMessage("Your currently verified account email is shown below. Check that it matches the new address you requested.");
      } catch {
        if (active) {
          setState("error");
          setMessage("Unable to check your account at this time. Please sign in and verify the email shown in Account Management.");
        }
      }
    };
    void inspect();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-[#FDF1F7] px-4 py-14 text-[#14283e]">
      <section className="mx-auto max-w-lg rounded-2xl border border-pink-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-bold text-[#F53D93]">HappyTails Pet Grooming Café</p>
        <h1 className="mt-3 text-2xl font-bold">Email Address Confirmation</h1>
        <p role="status" className={`mt-5 rounded-xl p-4 text-sm leading-6 ${state === "error" ? "bg-red-50 text-red-700" : state === "confirmed" ? "bg-green-50 text-green-800" : "bg-pink-50 text-[#14283e]"}`}>
          {message}
        </p>
        {email && <p className="mt-4 break-all text-sm"><strong>Current account email:</strong> {email}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/admin/profile" className="rounded-full bg-[#F53D93] px-5 py-2.5 text-sm font-bold text-white">Account Management</Link>
          <Link href="/sign-in" className="rounded-full border border-pink-200 px-5 py-2.5 text-sm font-semibold">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
