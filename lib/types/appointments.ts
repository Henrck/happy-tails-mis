export type Species = "Dog" | "Cat";
export type Sex = "Male" | "Female";

// The real size-guide tiers used throughout grooming pricing (matches
// pet_sizes.label for dog grooming). This is what a pet's own
// size_label is actually recorded as — not a generic "small/medium/
// large" guess. Boarding kennel-fit categories are a DIFFERENT,
// smaller vocabulary derived FROM this one (see kennelFitCategory
// below) — they're never stored, only computed when checking capacity.
export type GroomingSizeTier = "Small" | "Medium" | "Large" | "Extra Large" | "2X Extra Large";

export type Pet = {
  id: string;
  customer_id: string | null;
  name: string;
  species: Species;
  breed: string;
  size_label: string; // free text — usually a GroomingSizeTier for dogs, but not type-locked to it since cat sizing may differ and this stays flexible
  sex: Sex | null;
  age: number | null;
  owner_name: string | null; // only meaningful when customer_id is null — accountless pets need a name to show without depending on an appointment existing
  owner_contact: string | null;
  created_at: string;
};

export type AppointmentServiceType = "dog_grooming" | "cat_grooming" | "boarding" | "ala_carte";
export type AppointmentStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  service_type: AppointmentServiceType;
  customer_id: string | null;
  owner_name: string;
  owner_contact: string;
  owner_address: string | null;
  status: AppointmentStatus;
  is_walk_in: boolean;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null; // HH:MM, grooming only
  drop_off_at: string | null; // boarding only
  pick_up_at: string | null;
  special_requests: string | null;
  total_amount: number;
  created_at: string;
};

export type AppointmentPet = {
  id: string;
  appointment_id: string;
  pet_id: string;
  package_id: string | null; // null = Ala Carte, and always null for boarding — see package_pricing_id
  package_pricing_id: string | null; // boarding only: the chosen duration/rate row
  size_id: string | null;
  kennel_id: string | null; // boarding only
  groomer_id: string | null; // grooming only — per-pet, since a multi-pet booking can want different groomers per pet
  line_amount: number;
};

export type AppointmentAddon = {
  id: string;
  appointment_pet_id: string;
  addon_id: string;
  price: number;
};

// Shape used while building a booking in the wizard, before it's saved.
// Kept separate from the DB row types since a draft has looser
// requirements (no id yet, amounts still being computed).
export type DraftPetSelection = {
  pet: Pet;
  packageId: string | null; // null = Ala Carte; for boarding this is ALWAYS null now — see packagePricingId
  packagePricingId: string | null; // boarding only: the chosen duration/rate row (package_pricing.id) — kept separate from packageId, which is a real foreign key to packages.id and can never hold this value
  sizeId: string | null;
  kennelId: string | null;
  groomerId: string | null;
  addonIds: string[];
  lineAmount: number;
};
