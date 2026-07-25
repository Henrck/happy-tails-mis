// Mock appointment records, shaped close to what the real `appointments`
// table will look like. Swapping this for a Supabase query later should be
// a contained change (same pattern as products.ts / gallery.ts / admin-mock.ts).
import { todaysAppointmentCount } from "./admin-mock";

export type AppointmentStatus = "Pending" | "Confirmed" | "Cancelled";
export type ServiceType = "grooming" | "boarding";

export type Appointment = {
  id: string;
  petName: string;
  species: "Dog" | "Cat";
  breed: string;
  petWeightKg: number;
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  serviceType: ServiceType;
  packageName: string;
  addOns: { name: string; price: number }[];
  servicePrice: number;
  appointmentDate: string;
  status: AppointmentStatus;
  notes: string;
  belongings: string[];
  // grooming-only
  timeSlot?: string;
  groomer?: string;
  sessionStart?: string | null;
  // boarding-only
  duration?: string;
  dropOffDateTime?: string;
  pickUpDateTime?: string;
};

export const appointments: Appointment[] = [
  {
    id: "Appt-2026-01",
    petName: "Milo",
    species: "Dog",
    breed: "Aspin/Chuwawa",
    petWeightKg: 10,
    ownerName: "Josh Hernandez",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    serviceType: "boarding",
    packageName: "Big Kennel",
    addOns: [{ name: "Nail Clipping", price: 170 }],
    servicePrice: 2900,
    appointmentDate: "January 05, 2026",
    status: "Pending",
    notes: "",
    belongings: ["Toys", "Pet bed"],
    duration: "6D - 5N",
    dropOffDateTime: "",
    pickUpDateTime: "",
  },
  {
    id: "Appt-2026-02",
    petName: "Ceddy",
    species: "Dog",
    breed: "Shih Tzu",
    petWeightKg: 6,
    ownerName: "Jearron Brigoli",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    serviceType: "boarding",
    packageName: "Small Kennel",
    addOns: [],
    servicePrice: 2000,
    appointmentDate: "January 05, 2026",
    status: "Confirmed",
    notes: "",
    belongings: ["Feeding bowl"],
    duration: "1 Night",
    dropOffDateTime: "January 05, 2026 · 9:00AM",
    pickUpDateTime: "",
  },
  {
    id: "Appt-2026-03",
    petName: "Cody",
    species: "Dog",
    breed: "Aspin/Chuwawa",
    petWeightKg: 10,
    ownerName: "Jearron Brigoli",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    serviceType: "grooming",
    packageName: "Diamond",
    addOns: [{ name: "Nail Clipping", price: 500 }],
    servicePrice: 500,
    appointmentDate: "January 05, 2026",
    status: "Pending",
    notes: "",
    belongings: [],
    timeSlot: "9:00AM",
    groomer: "Francis Gomez",
    sessionStart: null,
  },
  {
    id: "Appt-2026-04",
    petName: "Luna",
    species: "Cat",
    breed: "Persian",
    petWeightKg: 4,
    ownerName: "Maria Santos",
    ownerContact: "0917123456",
    ownerAddress: "Noveleta, Cavite",
    serviceType: "grooming",
    packageName: "Premium",
    addOns: [],
    servicePrice: 650,
    appointmentDate: "January 06, 2026",
    status: "Confirmed",
    notes: "Sensitive skin, use hypoallergenic shampoo.",
    belongings: [],
    timeSlot: "1:30PM",
    groomer: "Francis Gomez",
    sessionStart: "1:35PM",
  },
  {
    id: "Appt-2026-05",
    petName: "Max",
    species: "Dog",
    breed: "Golden Retriever",
    petWeightKg: 28,
    ownerName: "Ana Reyes",
    ownerContact: "0928765432",
    ownerAddress: "Salcedo, Noveleta",
    serviceType: "boarding",
    packageName: "Big Kennel",
    addOns: [{ name: "Extra Walk", price: 100 }],
    servicePrice: 2400,
    appointmentDate: "January 04, 2026",
    status: "Cancelled",
    notes: "Owner rescheduled to next week.",
    belongings: ["Blanket"],
    duration: "5D - 4N",
    dropOffDateTime: "",
    pickUpDateTime: "",
  },
];

// Deliberately re-exported here so the Appointments page's "Today's
// Appointment" stat can never drift from the Dashboard's — both read from
// this single value, not two separately hardcoded numbers.
export { todaysAppointmentCount };

export const totalPetsRegistered = 8; // TODO: replace with count(*) from a `pets` table
export const totalTransactionToday = 40000; // TODO: replace with sum(total_price) for today
