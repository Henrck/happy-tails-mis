// Admin / Super Admin notifications (e.g. customer cancellations). Rows are
// created by database triggers (20261117_02_staff_cancellation_notifications.sql);
// read state is tracked per staff member.
import { createClient } from "./client";

export type StaffNotification = {
  id: string;
  kind: "customer_cancellation" | string;
  appointment_id: string | null;
  customer_id: string | null;
  title: string;
  message: string;
  details: { is_late?: boolean; days_before?: number; reason?: string | null; [key: string]: unknown };
  created_at: string;
  is_read: boolean;
};

/** Fired after marking as read so every badge on the page refreshes at once. */
export const STAFF_NOTIFICATIONS_READ_EVENT = "happytails:staff-notifications-read";

export async function fetchStaffNotifications(options: { limit?: number; unreadOnly?: boolean } = {}) {
  const { data, error } = await createClient().rpc("happytails_staff_notifications", {
    p_limit: options.limit ?? 50,
    p_unread_only: options.unreadOnly ?? false,
  });
  return { notifications: (data ?? []) as StaffNotification[], error: error?.message ?? null };
}

export async function fetchStaffUnreadCount() {
  const { data, error } = await createClient().rpc("happytails_staff_unread_notification_count");
  return { count: typeof data === "number" ? data : 0, error: error?.message ?? null };
}

/** Marks the given notifications (or all, when ids is omitted) as read for the current staff member. */
export async function markStaffNotificationsRead(ids?: string[]) {
  const { error } = await createClient().rpc("happytails_mark_staff_notifications_read", { p_ids: ids ?? null });
  if (!error && typeof window !== "undefined") window.dispatchEvent(new Event(STAFF_NOTIFICATIONS_READ_EVENT));
  return { error: error?.message ?? null };
}

/** Calls onChange whenever a new staff notification is created. Returns an unsubscribe function. */
export function subscribeToStaffNotifications(onChange: () => void) {
  const supabase = createClient();
  // Unique topic per caller: the sidebar badge and the page subscribe at the same time.
  const channel = supabase
    .channel(`staff-notifications-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_notifications" }, onChange)
    .subscribe();
  const onRead = () => onChange();
  window.addEventListener(STAFF_NOTIFICATIONS_READ_EVENT, onRead);
  return () => {
    window.removeEventListener(STAFF_NOTIFICATIONS_READ_EVENT, onRead);
    void supabase.removeChannel(channel);
  };
}
