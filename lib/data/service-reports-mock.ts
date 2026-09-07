// Mock service report data. Stats (Total/Completed/Cancelled) are always
// computed from this array, not hardcoded — same principle used
// throughout the project, so the KPI cards can never drift from the
// table's actual contents.
export type ReportStatus = "Completed" | "Ongoing" | "Scheduled" | "Cancelled";

export type ServiceReport = {
  id: string;
  pet: string;
  owner: string;
  service: string;
  date: string; // ISO for filtering/sorting
  displayDate: string;
  status: ReportStatus;
};

export const serviceReports: ServiceReport[] = [
  { id: "SR-00152", pet: "Cody", owner: "Kate Palcis", service: "Premium Grooming", date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Completed" },
  { id: "SR-00151", pet: "Max", owner: "Josh Hernandez", service: "Overnight Boarding", date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Ongoing" },
  { id: "SR-00150", pet: "Bella", owner: "Anna Reyes", service: "Consultation", date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Scheduled" },
  { id: "SR-00149", pet: "Luna", owner: "Maria Santos", service: "Diamond Grooming", date: "2026-07-20", displayDate: "Jul 20, 2026", status: "Completed" },
  { id: "SR-00148", pet: "Milo", owner: "Jearron Brigoli", service: "Basic Grooming", date: "2026-07-20", displayDate: "Jul 20, 2026", status: "Completed" },
  { id: "SR-00147", pet: "Irish", owner: "Ani Landrito", service: "Small Kennel Boarding", date: "2026-07-19", displayDate: "Jul 19, 2026", status: "Cancelled" },
  { id: "SR-00146", pet: "Ceddy", owner: "Josh Hernandez", service: "Premium Grooming", date: "2026-07-19", displayDate: "Jul 19, 2026", status: "Completed" },
  { id: "SR-00145", pet: "Rex", owner: "Kate Palcis", service: "Big Kennel Boarding", date: "2026-07-18", displayDate: "Jul 18, 2026", status: "Ongoing" },
  { id: "SR-00144", pet: "Coco", owner: "Ani Landrito", service: "Consultation", date: "2026-07-18", displayDate: "Jul 18, 2026", status: "Scheduled" },
  { id: "SR-00143", pet: "Berto", owner: "Jearron Brigoli", service: "Diamond Grooming", date: "2026-07-17", displayDate: "Jul 17, 2026", status: "Completed" },
  { id: "SR-00142", pet: "Ash", owner: "Maria Santos", service: "Basic Grooming", date: "2026-07-17", displayDate: "Jul 17, 2026", status: "Cancelled" },
  { id: "SR-00141", pet: "Tibs", owner: "Anna Reyes", service: "Small Kennel Boarding", date: "2026-07-16", displayDate: "Jul 16, 2026", status: "Completed" },
];
