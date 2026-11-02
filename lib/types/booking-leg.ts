import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

export type BookingLeg = {
  id: string;
  serviceChoice: WalkInServiceChoice;
  petIds: string[];
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  dropOffAt: string | null;
  pickUpAt: string | null;
  petBelongings: string[];
  specialRequests: string;
};

export function emptyLeg(serviceChoice: WalkInServiceChoice, petIds: string[]): BookingLeg {
  return {
    id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    serviceChoice,
    petIds,
    petSelections: [],
    scheduledDate: null,
    scheduledTime: null,
    dropOffAt: null,
    pickUpAt: null,
    petBelongings: [],
    specialRequests: "",
  };
}

export function eligibleServicesFor(
  allPets: Pet[],
  selectedPetIds: string[],
  completedLegs: BookingLeg[]
): WalkInServiceChoice[] {
  const selected = allPets.filter((p) => selectedPetIds.includes(p.id));
  const results: WalkInServiceChoice[] = [];
  const coveredBy = (service: WalkInServiceChoice) =>
    new Set(completedLegs.filter((l) => l.serviceChoice === service).flatMap((l) => l.petIds));

  const hasDog = selected.some((p) => p.species === "Dog");
  const hasCat = selected.some((p) => p.species === "Cat");
  if (hasDog || hasCat) results.push("grooming");

  // Boarding is one group reservation for the selected pets. Once added,
  // do not offer it again in "Other Services", even for an unselected pet.
  // This avoids a second Boarding leg accidentally competing for the same
  // two Big kennels and splitting pets that were meant to share.
  if (selected.length > 0 && !completedLegs.some((l) => l.serviceChoice === "boarding")) {
    results.push("boarding");
  }

  const alaCovered = coveredBy("ala_carte");
  if (selected.some((p) => !alaCovered.has(p.id))) results.push("ala_carte");
  return results;
}

export function autoQueuedGroomingLegs(_selectedPets: Pet[]): BookingLeg[] {
  return [];
}
