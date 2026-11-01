import { createClient } from "@/lib/supabase/client";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { DraftPetSelection } from "@/lib/types/appointments";

export const isGrooming = (choice: string) => ["grooming", "dog_grooming", "cat_grooming"].includes(choice);
export type ScheduledGroomingSelection = DraftPetSelection & { groomingScheduledTime?: string };

/** Final read-only plan check before the separate atomic booking transaction.
 * The appointment_pets insert trigger is the authoritative concurrency guard.
 */
export async function verifyGroomingLegPlans(legs: BookingLeg[]): Promise<string | null> {
  for (const leg of legs.filter(item => isGrooming(item.serviceChoice))) {
    if (!leg.scheduledDate || !leg.scheduledTime || !leg.petSelections.length) return "Grooming date or start time is missing.";
    const selections = leg.petSelections as ScheduledGroomingSelection[];
    if (selections.some(s => !s.packagePricingId || !s.groomerId || !s.groomingScheduledTime)) {
      return "A grooming reservation is incomplete. Edit the schedule to reassign each pet.";
    }
    const { data, error } = await createClient().rpc("happytails_grooming_plan_v2", {
      p_date: leg.scheduledDate,
      p_preferred_start: leg.scheduledTime,
      p_pricing_ids: selections.map(s => s.packagePricingId),
      p_groomer_ids: selections.map(s => s.groomerId),
    });
    if (error) return `Grooming availability changed: ${error.message}. Edit the schedule and review again.`;
    const next = data as Array<{ time: string; groomerId: string }> | null;
    if (!next || next.length !== selections.length || next.some((item, i) =>
      item.time !== selections[i].groomingScheduledTime || item.groomerId !== selections[i].groomerId)) {
      return "A groomer reservation has changed. Edit the grooming schedule and review the new times before saving.";
    }
  }
  return null;
}
