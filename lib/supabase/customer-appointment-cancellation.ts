import { createClient } from "@/lib/supabase/client";

export type CancellationPenaltyPreview = {
  requires_confirmation: boolean;
  is_late?: boolean;
  /** True for the 4th and later cancellation in one Philippine calendar day. */
  over_daily_limit?: boolean;
  /** Calendar days between today and the appointment date (Asia/Manila). */
  days_before?: number;
  /** This cancellation's number today, out of daily_limit. */
  cancellation_number?: number | null;
  daily_limit?: number;
  points_added?: number;
  penalty_count?: number;
  /** "12 hours", "2 days" or "1 month". */
  restriction_label?: string | null;
  message?: string;
};
export type CustomerCancellationResult = {
  error: string | null;
  /** Legacy: older database versions refused the 4th daily cancellation. */
  dailyLimitReached?: boolean;
  requiresConfirmation: boolean;
  penalty: CancellationPenaltyPreview | null;
};

/** The database checks the 3-calendar-day grace period and the 3-per-day limit
 * (4th+ cancellation = penalty) atomically. A first call can request confirmation
 * without cancelling. */
export async function cancelCustomerAppointment(
  appointmentId: string,
  reason: string,
  penaltyConfirmed = false,
  confirmedPenaltyCount: number | null = null,
): Promise<CustomerCancellationResult> {
  const clean = reason.trim();
  if (clean.length < 5 || clean.length > 500) return { error: "Please provide a cancellation reason between 5 and 500 characters.", requiresConfirmation: false, penalty: null };
  const { data, error } = await createClient().rpc("happytails_cancel_customer_appointment_with_limiter", {
    p_appointment_id: appointmentId,
    p_reason: clean,
    p_penalty_confirmed: penaltyConfirmed,
    p_confirmed_penalty_count: confirmedPenaltyCount,
  });
  if (error) {
    const limit = error.message.startsWith("DAILY_CANCELLATION_LIMIT:");
    return { error: limit ? error.message.replace("DAILY_CANCELLATION_LIMIT:", "").trim() : error.message, dailyLimitReached: limit, requiresConfirmation: false, penalty: null };
  }
  const result = (data ?? {}) as Record<string, unknown>;
  if (result.requires_confirmation === true) {
    return { error: null, requiresConfirmation: true, penalty: result as CancellationPenaltyPreview };
  }
  return { error: null, requiresConfirmation: false, penalty: result as CancellationPenaltyPreview };
}
