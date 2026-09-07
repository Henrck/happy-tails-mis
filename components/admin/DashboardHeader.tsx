"use client";
// Notification bell: shows a dropdown built entirely from data already
// on this dashboard (low stock items, pending appointments count) —
// deliberately NOT a separate notification system/table. There's no
// real event pipeline yet (no live inventory triggers, no real booking
// webhooks) to justify one; this surfaces what's already true and
// already actionable, which is more honest than inventing fake "new"
// notifications with nothing real behind them.
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { lowStockItems, pendingAppointmentsCount } from "@/lib/data/admin-mock";

export default function DashboardHeader() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalAlerts = lowStockItems.length + (pendingAppointmentsCount > 0 ? 1 : 0);

  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Welcome back, Admin!</p>
      </div>

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Notifications"
          aria-expanded={open}
          className="relative w-10 h-10 rounded-xl bg-white border border-pink-100 shadow-sm flex items-center justify-center text-zinc-500 hover:border-brand-pink transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" />
          </svg>
          {totalAlerts > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-brand-pink text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalAlerts}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-pink-100 overflow-hidden z-30">
            <div className="bg-brand-pink px-4 py-2.5">
              <h4 className="text-white font-bold text-sm">Notifications</h4>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {pendingAppointmentsCount > 0 && (
                <Link
                  href="/admin/appointments"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-pink-50 hover:bg-brand-tint transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" /></svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800">{pendingAppointmentsCount} pending appointments</p>
                    <p className="text-[11px] text-zinc-400">Waiting for confirmation</p>
                  </div>
                </Link>
              )}

              {lowStockItems.map((item) => (
                <Link
                  key={item.id}
                  href="/admin/inventory"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 border-b border-pink-50 last:border-none hover:bg-brand-tint transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 9v4M12 17h.01" strokeLinecap="round" /></svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800">{item.name}</p>
                    <p className="text-[11px] text-zinc-400">Only {item.remaining} left in stock</p>
                  </div>
                </Link>
              ))}

              {totalAlerts === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6">Nothing needs your attention right now.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
