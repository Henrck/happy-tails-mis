"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from "@/lib/supabase/notifications";
import type { Notification } from "@/lib/types/notifications";

const PAGE_SIZE = 10;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function iconForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("cancel")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (t.includes("ready") || t.includes("complet")) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const loadNotifications = useCallback(async (id: string) => {
    const { notifications: rows } = await fetchNotifications(id);
    setNotifications(rows);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadNotifications(user.id);
      setLoading(false);
    }
    init();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToNotifications(userId, () => loadNotifications(userId));
    return unsubscribe;
  }, [userId, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pageCount = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageNotifications = notifications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleMarkRead(n: Notification) {
    if (n.read) return;
    setNotifications((prev) => prev.map((row) => (row.id === n.id ? { ...row, read: true } : row)));
    const { error } = await markNotificationRead(n.id);
    if (error && userId) await loadNotifications(userId);
  }

  async function handleMarkAllRead() {
    if (!userId || unreadCount === 0) return;
    setNotifications((prev) => prev.map((row) => ({ ...row, read: true })));
    const { error } = await markAllNotificationsRead(userId);
    if (error) await loadNotifications(userId);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-800">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-pink hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-zinc-400">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-pink-100 bg-brand-tint px-6 py-10 text-center">
          <p className="text-sm text-zinc-500">
            You don&apos;t have any notifications yet. You&apos;ll see updates here as your appointments move along —
            confirmed, checked in, ready for pickup, and so on.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-2">
            {pageNotifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                  n.read ? "border-zinc-100 bg-white" : "border-pink-200 bg-brand-tint"
                }`}
              >
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  n.read ? "bg-zinc-100 text-zinc-400" : "bg-brand-pink text-white"
                }`}>
                  {iconForTitle(n.title)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm ${n.read ? "font-medium text-zinc-600" : "font-semibold text-zinc-800"}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-pink" />}
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-500">{n.message}</p>
                  <p className="mt-1 text-xs text-zinc-400">{relativeTime(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>

          {pageCount > 1 && (
            <nav aria-label="Notifications pagination" className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}
                className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40">
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" onClick={() => setPage(number)} aria-current={number === currentPage ? "page" : undefined}
                  className={`min-w-9 rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${number === currentPage ? "border-brand-pink bg-brand-pink text-white" : "border-pink-200 bg-white text-brand-pink hover:bg-brand-tint"}`}>
                  {number}
                </button>
              ))}
              <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}
                className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40">
                Next
              </button>
              <p className="w-full text-center text-xs text-zinc-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, notifications.length)} of {notifications.length} notifications
              </p>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
