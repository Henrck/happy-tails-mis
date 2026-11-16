export type Groomer = { id: string; name: string; status: "active" | "archived"; created_at: string };
export type KennelSize = "small" | "big";
export type Kennel = { id: string; size: KennelSize; number: number; created_at: string; is_active?: boolean; name?: string | null };
export const kennelDisplayName = (k: Pick<Kennel, "number" | "name">) => k.name?.trim() || `Kennel ${k.number}`;

// Day-of service tracking stages.
export type SessionStage = "scheduled" | "in_progress" | "completed" | "cancelled";
export type BoardingStage = "booked" | "checked_in" | "checked_out" | "cancelled";

// A finished grooming session as shown in the grooming History modal.
export type GroomingSession = {
  id: string;
  groomerName: string;
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  petName: string;
  breed: string;
  petWeightKg: number;
  appointmentDate: string;
  timeSlot: string;
  sessionStartedAt: string | null;
  services: string[];
  addOns: { name: string; price: number }[];
  servicePrice: number;
  notes: string;
  stage: SessionStage;
};
