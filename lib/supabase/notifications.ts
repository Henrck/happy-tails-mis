// Real notifications data layer. Rows are written entirely by the
// notify_appointment_status_change trigger (042_customer_notifications.sql)
// — nothing in the app ever inserts a notification directly.
import { createClient } from "./client";
import type { Notification } from "@/lib/types/notifications";

export async function fetchUnreadNotificationCount(customerId: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("read", false);
  return { count: count ?? 0, error: error?.message };
}

export async function fetchNotifications(customerId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  return { notifications: (data ?? []) as Notification[], error: error?.message };
}

export async function markNotificationRead(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  return { error: error?.message };
}

export async function markAllNotificationsRead(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("customer_id", customerId)
    .eq("read", false);
  return { error: error?.message };
}

// Same shape as subscribeToAppointments() in appointment-management.ts —
// fires onChange for any insert/update on this customer's own
// notifications, so the badge count and list update live (e.g. right
// when staff marks an appointment "Completed" on the admin side).
// Returns an unsubscribe function; caller must call it on unmount.
//
// The channel name includes a random suffix on purpose: the unread
// badge in DashboardNavbar and the notifications page itself both call
// this for the SAME customerId at the same time (the page renders
// inside the layout the navbar belongs to), and Supabase Realtime
// rejects a second channel trying to reuse a topic name that's already
// subscribed. Each caller needs its own channel, not a shared one.
export function subscribeToNotifications(customerId: string, onChange: () => void) {
  const supabase = createClient();
  const uniqueSuffix = Math.random().toString(36).slice(2);
  const channel = supabase
    .channel(`notifications-${customerId}-${uniqueSuffix}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `customer_id=eq.${customerId}` },
      onChange
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
