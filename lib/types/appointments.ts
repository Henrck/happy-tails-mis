export type Species = "Dog" | "Cat";
export type Sex = "Male" | "Female";

export type GroomingSizeTier =
  | "Small"
  | "Medium"
  | "Large"
  | "Extra Large"
  | "2X Extra Large";

export type Pet = {
  id: string;
  customer_id: string | null;
  name: string;
  species: Species;
  breed: string;
  size_label: string;
  sex: Sex | null;
  age: number | null;
  owner_name: string | null;
  owner_contact: string | null;
  created_at: string;
};

export type AppointmentServiceType =
  | "dog_grooming"
  | "cat_grooming"
  | "boarding"
  | "ala_carte";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled";

export type Appointment = {
  id: string;
  service_type: AppointmentServiceType;
  customer_id: string | null;
  owner_name: string;
  owner_contact: string;
  owner_address: string | null;
  status: AppointmentStatus;
  is_walk_in: boolean;
  scheduled_date: string;
  scheduled_time: string | null;
  drop_off_at: string | null;
  pick_up_at: string | null;
  special_requests: string | null;
  total_amount: number;
  created_at: string;
};

export type AppointmentPet = {
  id: string;
  appointment_id: string;
  pet_id: string;
  package_id: string | null;
  package_pricing_id: string | null;
  size_id: string | null;
  kennel_id: string | null;
  groomer_id: string | null;
  line_amount: number;
};

export type AppointmentAddon = {
  id: string;
  appointment_pet_id: string;
  addon_id: string;
  price: number;
};

export type DraftPetSelection = {
  pet: Pet;
  packageId: string | null;
  packagePricingId: string | null;
  sizeId: string | null;
  // Actual kennel number is assigned later in the Appointment module.
  kennelId: string | null;
  // Temporary booking choice used to carry the requested kennel size
  // through the wizard. The database derives the final kennel assignment
  // from the appointment check-in process.
  boardingKennelSize?: "small" | "big" | null;
  // Number of nights selected for open-ended/per-night boarding rates.
  boardingNights?: number | null;
  groomerId: string | null;
  addonIds: string[];
  lineAmount: number;
};
