import type { Customer } from "@/lib/types/users";
import type { ServiceType } from "@/lib/types/services";
import type { Pet, DraftPetSelection, AppointmentServiceType } from "@/lib/types/appointments";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

export type WalkInStep =
  | "verify"
  | "pet-info"
  | "service"
  | "waiver"
  | "selection"
  | "schedule"
  | "summary";

export type WalkInDraft = {
  customer: Customer | null;
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  serviceChoice: WalkInServiceChoice | null;
  waiverAgreed: boolean;
  pets: Pet[];
  petSelections: DraftPetSelection[];
  scheduledDate: string | null;
  scheduledTime: string | null;
  dropOffAt: string | null;
  pickUpAt: string | null;
  petBelongings: string[];
  specialRequests: string;
};

// Generic "grooming" is a UI-level service choice for mixed Dog + Cat
// bookings. It is not a DB service_type. Before saving, SummaryStep
// splits the selections by species and writes dog_grooming/cat_grooming.
export function toAppointmentServiceType(choice: Exclude<WalkInServiceChoice, "grooming">): AppointmentServiceType {
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
