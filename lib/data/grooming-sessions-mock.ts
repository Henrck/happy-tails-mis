// Mock grooming session data, shaped close to what the real
// `grooming_sessions` table will look like. A "session" here is distinct
// from an "appointment" (see admin-appointments-mock.ts) — an appointment
// is the booking; a session is the actual day-of tracking of that booking
// moving through Scheduled -> In Progress -> Completed.
export type SessionStage = "scheduled" | "in_progress" | "completed" | "cancelled";

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

export const groomingSessions: GroomingSession[] = [
  {
    id: "gs-1",
    groomerName: "Francis Gomez",
    ownerName: "Kate Palcis",
    ownerContact: "0917111222",
    ownerAddress: "Cavite City",
    petName: "Cody",
    breed: "Aspin/Chuwawa",
    petWeightKg: 10,
    appointmentDate: "January 05, 2026",
    timeSlot: "9:00AM",
    sessionStartedAt: "9:05AM",
    services: ["Grooming", "Diamond"],
    addOns: [{ name: "Nail Clipping", price: 500 }],
    servicePrice: 500,
    notes: "",
    stage: "in_progress",
  },
  {
    id: "gs-2",
    groomerName: "Francis Gomez",
    ownerName: "Jearron Brigoli",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    petName: "Milo",
    breed: "Shih Tzu",
    petWeightKg: 6,
    appointmentDate: "January 05, 2026",
    timeSlot: "10:00AM",
    sessionStartedAt: null,
    services: ["Grooming", "Premium"],
    addOns: [],
    servicePrice: 650,
    notes: "",
    stage: "scheduled",
  },
  {
    id: "gs-3",
    groomerName: "Francis Gomez",
    ownerName: "Jearron Brigoli",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    petName: "Ash",
    breed: "Poodle",
    petWeightKg: 5,
    appointmentDate: "January 05, 2026",
    timeSlot: "11:00AM",
    sessionStartedAt: null,
    services: ["Grooming", "Diamond"],
    addOns: [{ name: "Teeth Brushing", price: 150 }],
    servicePrice: 750,
    notes: "",
    stage: "scheduled",
  },
  {
    id: "gs-4",
    groomerName: "Lawrence Pinili",
    ownerName: "Josh Hernandez",
    ownerContact: "0987654456",
    ownerAddress: "Cavite City",
    petName: "Ceddy",
    breed: "Shih Tzu",
    petWeightKg: 6,
    appointmentDate: "January 05, 2026",
    timeSlot: "9:00AM",
    sessionStartedAt: "9:10AM",
    services: ["Grooming", "Diamond"],
    addOns: [],
    servicePrice: 850,
    notes: "",
    stage: "in_progress",
  },
  {
    id: "gs-5",
    groomerName: "Lawrence Pinili",
    ownerName: "Ani Landrito",
    ownerContact: "0928765432",
    ownerAddress: "Noveleta, Cavite",
    petName: "Irish",
    breed: "Pomeranian",
    petWeightKg: 3,
    appointmentDate: "January 05, 2026",
    timeSlot: "10:30AM",
    sessionStartedAt: null,
    services: ["Grooming", "Premium"],
    addOns: [],
    servicePrice: 650,
    notes: "",
    stage: "scheduled",
  },
  {
    id: "gs-6",
    groomerName: "Lawrence Pinili",
    ownerName: "Ani Landrito",
    ownerContact: "0928765432",
    ownerAddress: "Noveleta, Cavite",
    petName: "Tibs",
    breed: "Aspin",
    petWeightKg: 12,
    appointmentDate: "January 05, 2026",
    timeSlot: "11:30AM",
    sessionStartedAt: null,
    services: ["Grooming", "Diamond"],
    addOns: [],
    servicePrice: 1100,
    notes: "",
    stage: "scheduled",
  },
  {
    id: "gs-7",
    groomerName: "Francis Gomez",
    ownerName: "Maria Santos",
    ownerContact: "0917123456",
    ownerAddress: "Noveleta, Cavite",
    petName: "Luna",
    breed: "Persian Cat",
    petWeightKg: 4,
    appointmentDate: "January 05, 2026",
    timeSlot: "8:00AM",
    sessionStartedAt: "8:05AM",
    services: ["Grooming", "Premium"],
    addOns: [],
    servicePrice: 650,
    notes: "Sensitive skin, use hypoallergenic shampoo.",
    stage: "completed",
  },
];
