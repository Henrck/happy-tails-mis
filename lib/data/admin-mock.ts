// Mock data for the superadmin dashboard, shaped close to what the real
// Supabase tables (appointments, staff, inventory, transactions) will
// eventually look like — swapping this for real queries later should be a
// contained change, not a rewrite. Replace each export with a Supabase
// query once those tables exist.

export const todaysAppointmentCount = 8;
export const monthlyRevenue = 300000000;

export const staffOnDuty = [
  { id: "1", name: "Jane Hernandez", role: "Boarding", tasksToday: 10, status: "active" as const },
  { id: "2", name: "Aron Gonzalez", role: "Grooming", tasksToday: 20, status: "break" as const },
];

export const serviceShortcuts = [
  { id: "grooming", label: "Grooming", appointments: 9, walkIns: 32, href: "/admin/operations/grooming" },
  { id: "boarding", label: "Boarding", appointments: 9, walkIns: 32, href: "/admin/operations/boarding" },
];

export const recentActivity = [
  { id: "1", title: "Grooming appt booked — Luna (Shih Tzu)", meta: "9:02 AM · Website Booking" },
  { id: "2", title: "Boarding check-in — Max (Golden Retriever)", meta: "9:15 AM · Walk-in" },
  { id: "3", title: "Supply sold — Premium Dog Shampoo x2", meta: "10:00 AM · Counter Sale" },
  { id: "4", title: "Boarding check-in — Max (Golden Retriever)", meta: "9:15 AM · Walk-in" },
  { id: "5", title: "Low stock alert — Flea Collar (3 left)", meta: "10:20 AM · System Alert", isAlert: true },
  { id: "6", title: "Grooming appt booked — Luna (Shih Tzu)", meta: "9:02 AM · Website Booking" },
];

export const lowStockItems: { id: string; name: string; remaining: number }[] = [
  // Empty for now in the reference design too — the "Low Stock" card
  // showed no items in Josh's screenshot, kept that way here.
];

export const monthlyBookingTotals = [
  { label: "SEP", total: 2 },
  { label: "OCT", total: 12 },
  { label: "NOV", total: 7 },
  { label: "DEC", total: 8 },
  { label: "JAN", total: 12 },
];

// Appointments keyed by day-of-month, for the calendar. Using a fixed
// reference month so the demo data has something to click on regardless
// of what "today" actually is.
export const calendarAppointments: Record<number, { time: string; pet: string; service: string }[]> = {
  5: [{ time: "10:00 AM", pet: "Luna (Shih Tzu)", service: "Grooming — Diamond" }],
  12: [
    { time: "9:00 AM", pet: "Max (Golden Retriever)", service: "Boarding — Big Kennel" },
    { time: "1:30 PM", pet: "Bella (Poodle)", service: "Grooming — Premium" },
  ],
  18: [{ time: "11:00 AM", pet: "Coco (Pomeranian)", service: "Pet Spa" }],
};
