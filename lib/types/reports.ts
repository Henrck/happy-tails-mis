// Row shapes for the admin Reports pages. All rows are built from Supabase data
// in lib/supabase/reports.ts, sales.ts and inventory-reports.ts.

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

export type SalesInvoiceItem = {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type SalesReportRow = {
  id: string;                      // Sales UUID (stable React row key).
  invoiceNumber: string;
  items: SalesInvoiceItem[];
  itemName: string;                // Summarized product names for search/export.
  quantity: number;                // Total units in the invoice.
  totalPrice: number;              // Invoice total, not item total.
  cashReceived: number | null;     // Null means unknown, never invent zero.
  changeGiven: number | null;      // Based on invoice amount_paid / total_amount.
  paymentMethod: string;
  date: string;
  displayDate: string;
};

export type InventoryReportStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type InventoryReportRow = {
  id: string;
  itemName: string;
  category: string;
  stock: number;
  unit: string;
  price: number;
  status: InventoryReportStatus;
  expirationDate: string | null; // ISO, null = no expiration
};

/** POS returns: damaged/expired products replaced with the same item. */
export type ReturnReasonLabel = "Damaged" | "Expired" | "Other";
export type ReturnReportItem = { name: string; category: string; quantity: number; unitPrice: number };
export type ReturnReportRow = {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  items: ReturnReportItem[];
  itemName: string;
  units: number;
  /** Units x original unit price: the value of stock given out as replacements. */
  value: number;
  reason: ReturnReasonLabel;
  note: string | null;
  lateOverride: boolean;
  staff: string;
  purchaseDate: string;
  date: string;
  displayDate: string;
  createdAt: string;
};
