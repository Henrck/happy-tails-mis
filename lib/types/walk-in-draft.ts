// The in-progress state of a walk-in booking as it moves through the
// wizard. Nothing here is saved to the database until the final Summary
// step calls createAppointment() — this is purely client-side draft
// state, which is why it's looser than the real Appointment type (e.g.
// customer can be null with just ownerName/ownerContact filled in for a
// walk-in without an account).
import type { Customer } from "@/lib/types/users";
import type { ServiceType } from "@/lib/types/services";
import type { Pet, DraftPetSelection, AppointmentServiceType } from "@/lib/types/appointments";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

export type WalkInStep =
  | "verify"
  | "service"
  | "waiver"
  | "pet-info"
  | "selection"
  | "schedule"
  | "summary";

export type WalkInDraft = {
  customer: Customer | null; // null = walk-in without an account
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  serviceChoice: WalkInServiceChoice | null; // dog_grooming | cat_grooming | boarding | ala_carte — Ala Carte is a real 4th sibling, not a modifier
  waiverAgreed: boolean;
  pets: Pet[]; // pets involved in this booking (existing, selected, or newly added)
  petSelections: DraftPetSelection[]; // built up during the Selection step
  scheduledDate: string | null;
  scheduledTime: string | null;
  dropOffAt: string | null;
  pickUpAt: string | null;
  petBelongings: string[];
  specialRequests: string;
};

// Maps the wizard's 4-way choice down to the real appointments.service_type
// column, which only has 4 values too (dog_grooming/cat_grooming/boarding/
// ala_carte) — kept as a real function rather than assuming they're always
// identical, since the wizard's choice type could diverge from the DB
// column's allowed values later without this being the thing that breaks.
export function toAppointmentServiceType(choice: WalkInServiceChoice): AppointmentServiceType {
  return choice;
}

export function emptyDraft(): WalkInDraft {
  return {
    customer: null,
    ownerName: "",
    ownerContact: "",
    ownerAddress: "",
    serviceChoice: null,
    waiverAgreed: false,
    pets: [],
    petSelections: [],
    scheduledDate: null,
    scheduledTime: null,
    dropOffAt: null,
    pickUpAt: null,
    petBelongings: [],
    specialRequests: "",
  };
}
