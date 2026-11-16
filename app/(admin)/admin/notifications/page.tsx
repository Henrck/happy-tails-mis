"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BellOff, CalendarX2, CheckCheck, ShieldAlert } from "lucide-react";
import {
  fetchStaffNotifications,
  markStaffNotificationsRead,
  subscribeToStaffNotifications,
  type StaffNotification,
} from "@/lib/supabase/staff-notifications";

type Tab = "all" | "unread";

function timeLabel(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function StaffNotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [result, setResult] = useState<{ tab: Tab; items: StaffNotification[]; error: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void fetchStaffNotifications({ limit: 100, unreadOnly: tab === "unread" }).then(({ notifications, error }) => {
        if (active) setResult({ tab, items: notifications, error });
      });
    };
    refresh();
    const unsubscribe = subscribeToStaffNotifications(refresh);
    return () => { active = false; unsubscribe(); };
  }, [tab]);

  const loading = result?.tab !== tab;
  const items = loading ? [] : result.items;
  const unreadOnPage = items.filter(n => !n.is_read).length;

  async function markRead(ids?: string[]) {
    if (busy) return;
    setBusy(true);
    const { error } = await markStaffNotificationsRead(ids);
    if (error) setResult(r => r && { ...r, error });
    setBusy(false);
  }

  return <div className="mx-auto max-w-4xl space-y-5 pb-10">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Notifications</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Customer cancellations appear here as soon as they happen.</p>
      </div>
      <button type="button" disabled={busy || unreadOnPage === 0} onClick={() => void markRead()}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">
        <CheckCheck size={16}/> Mark all as read
      </button>
    </header>

    <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-full bg-white p-1 shadow-sm">
      {(["all", "unread"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
        className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === value ? "bg-brand-pink text-white" : "text-zinc-600 hover:bg-pink-50"}`}>
        {value === "all" ? "All" : "Unread"}
      </button>)}
    </div>

    {!loading && result.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error}</p>}
    {loading && <p role="status" className="py-12 text-center text-sm text-zinc-500">Loading notifications…</p>}
    {!loading && !result.error && items.length === 0 && <div className="flex flex-col items-center gap-2 rounded-2xl bg-white py-14 text-center text-sm text-zinc-500 shadow-sm">
      <BellOff size={28} className="text-zinc-300"/>{tab === "unread" ? "You're all caught up." : "No notifications yet."}
    </div>}

    <ul className="space-y-3">
      {items.map(n => {
        const late = n.details?.is_late === true;
        const Icon = late ? ShieldAlert : CalendarX2;
        return <li key={n.id} className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${n.is_read ? "border-zinc-100" : "border-pink-200 ring-1 ring-pink-100"}`}>
          <div className="flex gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${late ? "bg-amber-50 text-amber-600" : "bg-pink-50 text-brand-pink"}`}><Icon size={20}/></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <h2 className="flex items-center gap-2 font-bold text-zinc-900">
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-pink" aria-label="Unread"/>}
                  {n.title}
                </h2>
                <time dateTime={n.created_at} className="text-xs text-zinc-500">{timeLabel(n.created_at)}</time>
              </div>
              <p className="mt-1 break-words text-sm leading-6 text-zinc-600">{n.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                {n.appointment_id && <Link href={`/admin/appointments?appointment=${n.appointment_id}`}
                  onClick={() => { if (!n.is_read) void markStaffNotificationsRead([n.id]); }}
                  className="text-brand-pink hover:underline">View appointment</Link>}
                {!n.is_read && <button type="button" disabled={busy} onClick={() => void markRead([n.id])} className="text-zinc-500 hover:text-zinc-800 disabled:opacity-40">Mark as read</button>}
              </div>
            </div>
          </div>
        </li>;
      })}
    </ul>
  </div>;
}
