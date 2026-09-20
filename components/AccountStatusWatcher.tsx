"use client";
// Mounted once in the dashboard/admin layout. Catches the case
// middleware alone can't: someone already signed in and actively
// browsing when an admin deactivates their account. Middleware only
// runs on a new request, so without this, a deactivated user sitting
// on a page they'd already loaded would keep working until their next
// click. This subscribes live to the user's own row and reacts
// immediately when status flips away from "active".
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AccountStatusWatcher({
  userId,
  table,
}: {
  userId: string;
  table: "customers" | "staff_profiles";
}) {
  const router = useRouter();
  const [deactivated, setDeactivated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`account-status-${table}-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter: `id=eq.${userId}` },
        (payload) => {
          const newStatus = (payload.new as { status?: string })?.status;
          if (newStatus && newStatus !== "active") setDeactivated(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, table]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in?deactivated=1");
  }

  if (!deactivated) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden text-center">
        <div className="px-6 pt-7 pb-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-600">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-bold text-zinc-800">Your account is now deactivated</h3>
          <p className="mt-1 text-sm text-zinc-500">You&rsquo;ll be signed out. Please contact support if this is unexpected.</p>
        </div>
        <div className="px-6 pb-6">
          <button
            onClick={handleSignOut}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
