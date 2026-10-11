"use client";
// Keep an already-open page in sync with account-status changes.
// Middleware and server layouts still enforce authorization on requests.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BlockReason = "deactivated" | "unverified" | null;

export default function AccountStatusWatcher({
  userId,
  table,
}: {
  userId: string;
  table: "customers" | "staff_profiles";
}) {
  const router = useRouter();
  const [blockReason, setBlockReason] = useState<BlockReason>(null);
  const [checking, setChecking] = useState(false);
  // One browser client for the lifetime of this mounted watcher.
  const [supabase] = useState(createClient);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.from(table)
        .select("status")
        .eq("id", userId)
        .maybeSingle();
      if (error || !data) setBlockReason("unverified");
      else if (data.status !== "active") setBlockReason("deactivated");
      else setBlockReason(null);
    } catch {
      setBlockReason("unverified");
    } finally {
      setChecking(false);
    }
  }, [supabase, table, userId]);

  useEffect(() => {
    void recheck();
    const channel = supabase
      .channel(`account-status-${table}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `id=eq.${userId}` },
        () => { void recheck(); }
      )
      .subscribe();
    window.addEventListener("focus", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, table, recheck]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace(blockReason === "deactivated" ? "/sign-in?deactivated=1" : "/sign-in?access=unverified");
    router.refresh();
  }

  if (!blockReason) return null;

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
          <h3 className="mt-3 text-lg font-bold text-zinc-800">
            {blockReason === "deactivated" ? "Your account is now deactivated" : "Account access could not be verified"}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {blockReason === "deactivated"
              ? "Your account is inactive or archived. Please contact support."
              : "We couldn't confirm that your account is active. Retry or contact support."}
          </p>
        </div>
        <div className="px-6 pb-6 space-y-2">
          {blockReason === "unverified" && (
            <button type="button" onClick={() => void recheck()} disabled={checking}
              className="w-full border-2 border-brand-pink text-brand-pink font-semibold py-2.5 rounded-full disabled:opacity-50">
              {checking ? "Checking…" : "Retry verification"}
            </button>
          )}
          <button onClick={handleSignOut}
            className="w-full bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold py-2.5 rounded-full">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
