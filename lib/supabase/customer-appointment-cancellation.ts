import { createClient } from "@/lib/supabase/client";

export type CancellationPenaltyPreview = {
  requires_confirmation: boolean;
  is_late?: boolean;
  late_cancellation_number?: number | null;
  points_added?: number;
  penalty_count?: number;
  restriction_days?: number;
  message?: string;
};
export type CustomerCancellationResult = {
  error: string | null;
  requiresConfirmation: boolean;
  penalty: CancellationPenaltyPreview | null;
};

/** The database rechecks the 72-hour grace period and daily late-cancellation
 * allowance atomically. A first call can request confirmation without cancelling. */
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
  if (error) return { error: error.message, requiresConfirmation: false, penalty: null };
  const result = (data ?? {}) as Record<string, unknown>;
  if (result.requires_confirmation === true) {
    return { error: null, requiresConfirmation: true, penalty: result as CancellationPenaltyPreview };
  }
  return { error: null, requiresConfirmation: false, penalty: result as CancellationPenaltyPreview };
}
