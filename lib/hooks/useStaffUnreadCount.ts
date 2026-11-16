"use client";
import { useEffect, useState } from "react";
import { fetchStaffUnreadCount, subscribeToStaffNotifications } from "@/lib/supabase/staff-notifications";

/** Live unread staff-notification count for the signed-in admin/superadmin. */
export function useStaffUnreadCount(enabled: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const refresh = () => {
      void fetchStaffUnreadCount().then(({ count: next }) => { if (active) setCount(next); });
    };
    refresh();
    const unsubscribe = subscribeToStaffNotifications(refresh);
    // Fallback in case Realtime is unavailable.
    const timer = window.setInterval(refresh, 60_000);
    return () => { active = false; unsubscribe(); window.clearInterval(timer); };
  }, [enabled]);
  return enabled ? count : 0;
}
