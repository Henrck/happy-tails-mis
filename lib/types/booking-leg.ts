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

  if (hasDog || hasCat) {
    results.push("grooming");
  }

  const boardingCovered = coveredBy("boarding");
  if (selected.some((p) => !boardingCovered.has(p.id))) results.push("boarding");

  const alaCovered = coveredBy("ala_carte");
  if (selected.some((p) => !alaCovered.has(p.id))) results.push("ala_carte");

  return results;
}

// Kept only for backwards compatibility with older imports.
// Species never auto-creates a service; the customer explicitly chooses
// the service after the selected pets are known.
export function autoQueuedGroomingLegs(_selectedPets: Pet[]): BookingLeg[] {
  return [];
}
