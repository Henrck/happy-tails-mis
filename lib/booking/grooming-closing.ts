/** Philippine grooming booking cut-off: all work must FINISH by 5:30 PM.
 * Actual treatment durations come from the verified package duration planner.
 * A 30-minute booking may start at 5 PM; a second 30-minute pet assigned to
 * the same groomer cannot start at 5:30 PM.
 */
export const GROOMING_OPEN_MINUTES = 9 * 60;
export const GROOMING_CLOSE_MINUTES = 17 * 60 + 30;
export const GROOMING_MIN_SESSION_MINUTES = 30;

export function groomingMinutes(time: string | null | undefined): number | null {
  if (!time || !/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) return null;
  const [hour, minute, second = 0] = time.split(":").map(Number);
  if (hour > 23 || minute > 59 || second > 59 || second !== 0) return null;
  return hour * 60 + minute;
}

export type GroomingPlannedSlot = {
  time: string;
  endTime: string;
  groomerId: string;
  durationMinutes: number;
};

/** All pets must fit before closing; check the whole planner result, not the selected start only. */
export function groomingPlanClosingError(plan: GroomingPlannedSlot[]): string | null {
  if (!plan.length) return "Select pets and arrange their grooming times first.";
  const perGroomer = new Map<string, Array<{ start: number; end: number }>>();
  for (const item of plan) {
    const start = groomingMinutes(item.time);
    const end = groomingMinutes(item.endTime);
    if (!item.groomerId || start === null || end === null ||
        !Number.isInteger(item.durationMinutes) || item.durationMinutes < GROOMING_MIN_SESSION_MINUTES ||
        start < GROOMING_OPEN_MINUTES || end !== start + item.durationMinutes) {
      return "The grooming schedule contains an invalid start, duration, or groomer. Arrange the times again.";
    }
    if (end > GROOMING_CLOSE_MINUTES) {
      return `Grooming must finish by 5:30 PM. A pet scheduled at ${formatGroomingClock(item.time)} would finish at ${formatGroomingClock(item.endTime)}. Choose an earlier time or additional available groomers.`;
    }
    const rows = perGroomer.get(item.groomerId) ?? [];
    rows.push({ start, end });
    perGroomer.set(item.groomerId, rows);
  }
  for (const rows of perGroomer.values()) {
    rows.sort((a, b) => a.start - b.start);
    if (rows.some((row, index) => index > 0 && row.start < rows[index - 1].end)) {
      return "A groomer was assigned overlapping pet sessions. Choose different grooming times.";
    }
  }
  return null;
}

export function formatGroomingClock(value: string): string {
  const minutes = groomingMinutes(value);
  if (minutes === null) return value;
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** A *necessary*, not sufficient, capacity bound. The server planner performs
 * the authoritative groomer, package-duration, and time-off check.
 */
export function minimumGroomersNeeded(petCount: number, start: string): number {
  const minutes = groomingMinutes(start);
  if (minutes === null || minutes < GROOMING_OPEN_MINUTES) return Number.POSITIVE_INFINITY;
  const availableMinutes = GROOMING_CLOSE_MINUTES - minutes;
  const maxPetsPerGroomer = Math.floor(availableMinutes / GROOMING_MIN_SESSION_MINUTES);
  return maxPetsPerGroomer > 0 ? Math.ceil(petCount / maxPetsPerGroomer) : Number.POSITIVE_INFINITY;
}
