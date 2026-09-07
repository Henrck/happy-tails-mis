// Mock data for the superadmin dashboard v2.

export const todaysAppointmentCount = 8;
export const monthlyRevenue = 300000;
export const monthlyRevenueChangePercent = 12;
export const pendingAppointmentsCount = 15;

export const todaysServices = {
  grooming: { appointments: 9, walkIns: 32 },
  boarding: { appointments: 9, walkIns: 32 },
};

export const lowStockItems = [
  { id: "1", name: "Flea Collar", remaining: 3 },
  { id: "2", name: "Premium Dog Shampoo", remaining: 4 },
  { id: "3", name: "Dog Treats (Chicken)", remaining: 5 },
];

export type ActivityCategory = "System Alert" | "Counter Sale" | "Walk-in" | "Website Booking";

export const recentActivity: {
  id: string; time: string; title: string; category: ActivityCategory; icon: "alert" | "cart" | "user" | "calendar";
}[] = [
  { id: "1", time: "10:20 AM", title: "Low stock alert: Flea Collar (3 left)", category: "System Alert", icon: "alert" },
  { id: "2", time: "10:00 AM", title: "Supply sold: Premium Dog Shampoo x2", category: "Counter Sale", icon: "cart" },
  { id: "3", time: "9:15 AM", title: "Boarding check-in: Max (Golden Retriever)", category: "Walk-in", icon: "user" },
  { id: "4", time: "9:02 AM", title: "Grooming appointment booked: Luna (Shih Tzu)", category: "Website Booking", icon: "calendar" },
];

export type ScheduleServiceType = "Grooming" | "Boarding";

export const todaysSchedule: {
  id: string; time: string; title: string; petInfo: string; service: ScheduleServiceType;
}[] = [
  { id: "1", time: "09:00 AM", title: "Grooming Appointment", petInfo: "Luna (Shih Tzu)", service: "Grooming" },
  { id: "2", time: "10:30 AM", title: "Boarding Check-in", petInfo: "Max (Golden Retriever)", service: "Boarding" },
  { id: "3", time: "01:00 PM", title: "Grooming Appointment", petInfo: "Cody (Aspin)", service: "Grooming" },
  { id: "4", time: "04:00 PM", title: "Boarding Pickup", petInfo: "Bella (Poodle)", service: "Boarding" },
  { id: "5", time: "05:30 PM", title: "Walk-in Grooming", petInfo: "", service: "Grooming" },
];

// Calendar events, now with real appointment detail per entry (not just a
// type for the dot color) — needed so clicking a day can show an actual
// schedule, not just a colored marker.
export type CalendarEventType = "grooming" | "boarding" | "walkin" | "other";
export type CalendarEvent = {
  type: CalendarEventType;
  time: string;
  petName: string;
  service: string;
};

export const calendarEvents: Record<number, CalendarEvent[]> = {
  1: [{ type: "grooming", time: "9:00 AM", petName: "Milo", service: "Basic Grooming" }],
  2: [{ type: "boarding", time: "10:00 AM", petName: "Rex", service: "Small Kennel" }],
  3: [{ type: "walkin", time: "1:00 PM", petName: "Ash", service: "Walk-in Grooming" }],
  4: [{ type: "grooming", time: "11:00 AM", petName: "Coco", service: "Premium Grooming" }],
  5: [{ type: "grooming", time: "9:00 AM", petName: "Luna", service: "Diamond Grooming" }],
  6: [{ type: "boarding", time: "2:00 PM", petName: "Max", service: "Big Kennel" }],
  8: [{ type: "boarding", time: "10:30 AM", petName: "Bella", service: "Small Kennel" }],
  9: [{ type: "walkin", time: "3:00 PM", petName: "Tibs", service: "Walk-in Grooming" }],
  10: [{ type: "grooming", time: "9:00 AM", petName: "Irish", service: "Basic Grooming" }],
  11: [{ type: "grooming", time: "1:00 PM", petName: "Berto", service: "Premium Grooming" }],
  12: [{ type: "grooming", time: "9:00 AM", petName: "Cody", service: "Diamond Grooming" }],
  13: [{ type: "boarding", time: "11:00 AM", petName: "Josh", service: "Big Kennel" }],
  14: [{ type: "grooming", time: "10:00 AM", petName: "Ani", service: "Basic Grooming" }],
  15: [{ type: "grooming", time: "2:00 PM", petName: "Mark", service: "Premium Grooming" }],
  16: [{ type: "boarding", time: "9:00 AM", petName: "Kate", service: "Small Kennel" }],
  17: [{ type: "grooming", time: "1:30 PM", petName: "Milo", service: "Diamond Grooming" }],
  18: [{ type: "walkin", time: "4:00 PM", petName: "Rex", service: "Walk-in Grooming" }],
  19: [{ type: "grooming", time: "9:00 AM", petName: "Luna", service: "Basic Grooming" }],
  20: [{ type: "boarding", time: "10:00 AM", petName: "Max", service: "Big Kennel" }],
  21: [{ type: "grooming", time: "11:00 AM", petName: "Coco", service: "Premium Grooming" }],
  22: [
    { type: "grooming", time: "9:00 AM", petName: "Luna", service: "Grooming — Diamond" },
    { type: "boarding", time: "10:30 AM", petName: "Max", service: "Boarding — Check-in" },
    { type: "grooming", time: "1:00 PM", petName: "Cody", service: "Grooming — Basic" },
  ],
  23: [{ type: "boarding", time: "2:00 PM", petName: "Bella", service: "Small Kennel" }],
  24: [{ type: "boarding", time: "9:00 AM", petName: "Josh", service: "Big Kennel" }],
  25: [{ type: "walkin", time: "3:30 PM", petName: "Tibs", service: "Walk-in Grooming" }],
  26: [{ type: "grooming", time: "9:00 AM", petName: "Irish", service: "Diamond Grooming" }],
  27: [{ type: "walkin", time: "1:00 PM", petName: "Ash", service: "Walk-in Grooming" }],
  28: [{ type: "grooming", time: "10:00 AM", petName: "Berto", service: "Basic Grooming" }],
};

export const bookingsByWeek = [
  { label: "Mon, Jul 14", total: 12 }, { label: "Tue, Jul 15", total: 18 }, { label: "Wed, Jul 16", total: 14 },
  { label: "Thu, Jul 17", total: 22 }, { label: "Fri, Jul 18", total: 16 }, { label: "Sat, Jul 19", total: 20 }, { label: "Sun, Jul 20", total: 10 },
];
export const bookingsByMonth = [
  { label: "Feb", total: 62 }, { label: "Mar", total: 74 }, { label: "Apr", total: 58 },
  { label: "May", total: 81 }, { label: "Jun", total: 69 }, { label: "Jul", total: 92 },
];
export const bookingsByYear = [
  { label: "2022", total: 410 }, { label: "2023", total: 520 }, { label: "2024", total: 605 }, { label: "2025", total: 712 }, { label: "2026", total: 340 },
];
