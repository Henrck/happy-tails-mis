// Mock boarding data. Unlike grooming (grouped by groomer), boarding is
// grouped by physical kennel — each kennel either holds an active
// session or is empty/available. Once a session is checked out and paid,
// it moves to `boardingHistory` and the kennel becomes available again
// for a new booking.
export type BoardingStage = "booked" | "checked_in" | "checked_out" | "cancelled";
export type KennelSize = "small" | "big";

export type BoardingSession = {
  id: string;
  ownerName: string;
  ownerContact: string;
  ownerAddress: string;
  petName: string;
  breed: string;
  petWeightKg: number;
  appointmentDate: string;
  duration: string;
  dropOffDateTime: string;
  pickUpDateTime: string;
  timeIn: string;
  services: string[];
  addOns: { name: string; price: number }[];
  servicePrice: number;
  notes: string;
  belongings: string[];
  stage: BoardingStage;
  paymentMethod?: string;
  amountPaid?: number;
};

export type Kennel = {
  id: string;
  size: KennelSize;
  number: number;
  session: BoardingSession | null;
};

// 5 small + 5 big kennels. Two of each size have an active session (one
// checked_in, one still just booked), the rest are available — same
// proportions as Josh's reference, just enough kennels to make the
// "available" count actually mean something.
export const kennels: Kennel[] = [
  {
    id: "small-101",
    size: "small",
    number: 101,
    session: {
      id: "bs-1",
      ownerName: "Kate Palcis",
      ownerContact: "0917111222",
      ownerAddress: "Cavite City",
      petName: "Irish",
      breed: "Pomeranian",
      petWeightKg: 3,
      appointmentDate: "January 05, 2026",
      duration: "6D - 5N",
      dropOffDateTime: "",
      pickUpDateTime: "",
      timeIn: "12/01/26 - 2:00pm",
      services: ["Boarding", "Small Kennel", "6D & 5N"],
      addOns: [{ name: "Nail Clipping", price: 170 }],
      servicePrice: 2900,
      notes: "",
      belongings: ["Toys", "Pet bed"],
      stage: "checked_in",
    },
  },
  {
    id: "small-102",
    size: "small",
    number: 102,
    session: {
      id: "bs-2",
      ownerName: "Jearron Brigoli",
      ownerContact: "0987654456",
      ownerAddress: "Cavite City",
      petName: "Irish",
      breed: "Shih Tzu",
      petWeightKg: 6,
      appointmentDate: "January 05, 2026",
      duration: "3D - 2N",
      dropOffDateTime: "",
      pickUpDateTime: "",
      timeIn: "12/01/26 - 1:00pm",
      services: ["Boarding", "Small Kennel", "3D & 2N"],
      addOns: [],
      servicePrice: 1020,
      notes: "",
      belongings: ["Feeding bowl"],
      stage: "booked",
    },
  },
  { id: "small-103", size: "small", number: 103, session: null },
  { id: "small-104", size: "small", number: 104, session: null },
  { id: "small-105", size: "small", number: 105, session: null },
  {
    id: "big-101",
    size: "big",
    number: 101,
    session: {
      id: "bs-3",
      ownerName: "Ani Landrito",
      ownerContact: "0928765432",
      ownerAddress: "Noveleta, Cavite",
      petName: "Irish",
      breed: "Golden Retriever",
      petWeightKg: 28,
      appointmentDate: "January 05, 2026",
      duration: "6D - 5N",
      dropOffDateTime: "",
      pickUpDateTime: "",
      timeIn: "12/01/26 - 11:00am",
      services: ["Boarding", "Big Kennel", "6D & 5N"],
      addOns: [{ name: "Nail Clipping", price: 170 }],
      servicePrice: 2900,
      notes: "",
      belongings: ["Toys", "Pet bed"],
      stage: "checked_in",
    },
  },
  {
    id: "big-102",
    size: "big",
    number: 102,
    session: {
      id: "bs-4",
      ownerName: "Ani Landrito",
      ownerContact: "0928765432",
      ownerAddress: "Noveleta, Cavite",
      petName: "Irish",
      breed: "Golden Retriever",
      petWeightKg: 28,
      appointmentDate: "January 05, 2026",
      duration: "4D - 3N",
      dropOffDateTime: "",
      pickUpDateTime: "",
      timeIn: "12/01/26 - 3:00pm",
      services: ["Boarding", "Big Kennel", "4D & 3N"],
      addOns: [],
      servicePrice: 1845,
      notes: "",
      belongings: [],
      stage: "booked",
    },
  },
  { id: "big-103", size: "big", number: 103, session: null },
  { id: "big-104", size: "big", number: 104, session: null },
  { id: "big-105", size: "big", number: 105, session: null },
];

// Completed (checked_out + paid) sessions live here for History, separate
// from the live `kennels` array.
export const boardingHistory: BoardingSession[] = [];
