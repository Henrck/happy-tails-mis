// A "leg" is one complete service booking within a multi-service
// customer appointment — e.g. Dog Grooming for Rex is one leg, Cat
// Grooming for Whiskers is a second leg, both built in the same
// session and saved together as two separate real appointments rows
// at the end. This is what makes "pick both Dog and Cat Grooming, set
// each one up in turn, one combined summary" actually work: each leg
// is independently a full, valid booking (its own service, pets,
// selections, and schedule), and createAppointment() already creates
// exactly one appointments row per call — so N legs just means N calls
// at save time, not a new save mechanism.
//
// When both a dog and cat are selected, grooming legs are AUTO-QUEUED
// (see autoQueuedGroomingLegs below) — the customer never sees a
// manual "pick a service" screen for the obvious grooming-per-species
// case, only for genuinely optional additions like Boarding.
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

export type BookingLeg = {
  id: string; // client-side only, for React keys / editing an in-progress leg — never sent to the DB
  serviceChoice: WalkInServiceChoice;
  petIds: string[]; // which of the customer's selected pets this leg covers
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null; // grooming only
  dropOffAt: string | null; // boarding only
  pickUpAt: string | null;
  petBelongings: string[]; // boarding only
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

// A service is "still eligible" to offer in the "Add another service?"
// prompt if: it's species-appropriate for at least one pet that hasn't
// already been used in a completed leg for that same service, and
// hasn't itself already been completed for all its eligible pets.
// Boarding/Ala Carte are species-agnostic, so they stay eligible as
// long as ANY pet hasn't already gotten that service.
export function eligibleServicesFor(
  allPets: Pet[],
  selectedPetIds: string[],
  completedLegs: BookingLeg[]
): WalkInServiceChoice[] {
  const selected = allPets.filter((p) => selectedPetIds.includes(p.id));
  const results: WalkInServiceChoice[] = [];

  const hasUncoveredSpecies = (species: "Dog" | "Cat", serviceType: WalkInServiceChoice) => {
    const petsOfSpecies = selected.filter((p) => p.species === species).map((p) => p.id);
    if (petsOfSpecies.length === 0) return false;
    const coveredIds = new Set(
      completedLegs.filter((l) => l.serviceChoice === serviceType).flatMap((l) => l.petIds)
    );
    return petsOfSpecies.some((id) => !coveredIds.has(id));
  };

  const hasUncoveredAny = (serviceType: WalkInServiceChoice) => {
    const coveredIds = new Set(
      completedLegs.filter((l) => l.serviceChoice === serviceType).flatMap((l) => l.petIds)
    );
    return selected.some((p) => !coveredIds.has(p.id));
  };

  if (hasUncoveredSpecies("Dog", "dog_grooming")) results.push("dog_grooming");
  if (hasUncoveredSpecies("Cat", "cat_grooming")) results.push("cat_grooming");
  if (hasUncoveredAny("boarding")) results.push("boarding");
  if (hasUncoveredAny("ala_carte")) results.push("ala_carte");

  return results;
}

// Auto-queue: when both a dog and a cat are selected, the system
// decides Dog Grooming then Cat Grooming automatically — no manual
// Service Choice screen for either leg. This only ever returns
// grooming legs; anything else (Boarding, Ala Carte) stays a genuine
// customer choice via the "Add another service?" prompt, since those
// aren't an obvious consequence of which species were selected the way
// grooming is.
export function autoQueuedGroomingLegs(selectedPets: Pet[]): BookingLeg[] {
  const dogs = selectedPets.filter((p) => p.species === "Dog");
  const cats = selectedPets.filter((p) => p.species === "Cat");
  const legs: BookingLeg[] = [];
  if (dogs.length > 0) legs.push(emptyLeg("dog_grooming", dogs.map((p) => p.id)));
  if (cats.length > 0) legs.push(emptyLeg("cat_grooming", cats.map((p) => p.id)));
  return legs;
}
