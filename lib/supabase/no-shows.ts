import { createClient } from "@/lib/supabase/client";

/** Cancels appointments still not checked in 24 hours after their scheduled
 * start and applies the no-show penalty (see the 20261117_01_cancellation_penalty_rules_v2
 * migration). Idempotent; called when staff/customer pages open so results show
 * promptly. The cron route and optional pg_cron job are the fallback. */
export async function processOverdueNoShows(): Promise<number> {
  const { data, error } = await createClient().rpc("happytails_process_overdue_no_shows");
  if (error) { console.warn("Overdue no-show check failed:", error.message); return 0; }
  return typeof data === "number" ? data : 0;
}
