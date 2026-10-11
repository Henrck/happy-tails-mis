// Shared Service Report shape. Actual report records come from Supabase.
export type ReportStatus = "Completed" | "Ongoing" | "Scheduled" | "Cancelled";
export type ServiceCategory = "Grooming" | "Boarding" | "Ala Carte";
export type AppointmentSource = "Walk-in" | "Online";

export type ServiceReport = {
  id: string;                       // Immutable G01 / B01 / A01, issued by DB.
  appointmentId: string;            // Original UUID remains available for auditing.
  appointmentPetId: string;
  pet: string;
  owner: string;
  category: ServiceCategory;
  service: string;
  source: AppointmentSource;
  amount: number;                   // Service charge, NOT proof of payment.
  date: string;                     // ISO date for sorting/filtering.
  displayDate: string;
  status: ReportStatus;
};

// Kept as an empty example collection for any old imports; UI uses real data.
export const serviceReports: ServiceReport[] = [];
