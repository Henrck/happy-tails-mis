import type { BookingLeg } from "@/lib/types/booking-leg";

export type PendingGroomerInterval = {
  groomerId: string;
  startMinute: number;
  endMinute: number;
};

export function clockMinutes(value: string | null | undefined): number | null {
  if (!value || !/^\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
}

export function isPendingGroomerBusy(
  intervals: PendingGroomerInterval[], groomerId: string,
  startMinute: number, durationMinutes = 30,
): boolean {
  return intervals.some(item => item.groomerId === groomerId &&
    item.startMinute < startMinute + durationMinutes && item.endMinute > startMinute);
}

// A pending leg has not been inserted in Supabase yet. Don't rely on
// database availability alone when a customer books several services together.
export function pendingGroomerSelections(legs: BookingLeg[], selectedDate: string) {
  return legs.flatMap(leg => {
    if (leg.scheduledDate !== selectedDate ||
        !["grooming", "dog_grooming", "cat_grooming", "ala_carte"].includes(leg.serviceChoice)) return [];
    return leg.petSelections.flatMap(selection => {
      const start = clockMinutes(leg.serviceChoice === "ala_carte" ? leg.scheduledTime :
        (selection as typeof selection & { groomingScheduledTime?: string }).groomingScheduledTime ?? leg.scheduledTime);
      if (!selection.groomerId || start === null) return [];
      return [{
        groomerId: selection.groomerId, startMinute: start,
        packagePricingId: leg.serviceChoice === "ala_carte" ? null : selection.packagePricingId,
      }];
    });
  });
}
