import type { DraftPetSelection } from "@/lib/types/appointments";
import type { Kennel } from "@/lib/types/pet-services";
import { shareGroups, validShareGroup, type ShareSelection } from "@/lib/booking/boarding-share";

/** Physical-capacity precheck only. Availability for a particular date/stay is
 * still decided by the existing SQL group planner. */
export function boardingPhysicalCapacity(selections: DraftPetSelection[], kennels: Kennel[]) {
  const active = kennels.filter(k => k.is_active !== false);
  const smallAvailable = active.filter(k => k.size === "small").length;
  const bigAvailable = active.filter(k => k.size === "big").length;
  const grouped = new Set<string>();
  let smallNeeded = 0;
  let bigNeeded = 0;
  for (const group of shareGroups(selections as ShareSelection[])) {
    if (!validShareGroup(group)) continue;
    bigNeeded++;
    for (const pet of group) grouped.add(pet.pet.id);
  }
  for (const pet of selections) {
    if (grouped.has(pet.pet.id)) continue;
    if (pet.boardingKennelSize === "big") bigNeeded++;
    else if (pet.boardingKennelSize === "small") smallNeeded++;
  }
  return {
    smallNeeded, bigNeeded, smallAvailable, bigAvailable,
    exceeded: smallNeeded > smallAvailable || bigNeeded > bigAvailable,
  };
}

export function boardingCapacityMessage(counts: ReturnType<typeof boardingPhysicalCapacity>) {
  const issues = [
    counts.bigNeeded > counts.bigAvailable
      ? `${counts.bigNeeded} Big kennel${counts.bigNeeded === 1 ? "" : "s"} needed, but only ${counts.bigAvailable} active Big kennel${counts.bigAvailable === 1 ? "" : "s"} configured`
      : null,
    counts.smallNeeded > counts.smallAvailable
      ? `${counts.smallNeeded} Small kennel${counts.smallNeeded === 1 ? "" : "s"} needed, but only ${counts.smallAvailable} active Small kennel${counts.smallAvailable === 1 ? "" : "s"} configured`
      : null,
  ].filter(Boolean);
  return `These pets cannot all stay in one Boarding appointment: ${issues.join("; ")}. Select fewer pets using the Editing list, finish this reservation, then create another Boarding appointment for the remaining pets. Separate appointments still require their own date and kennel availability checks.`;
}
