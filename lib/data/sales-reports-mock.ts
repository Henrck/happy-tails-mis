// Invoice-level Sales Report types. Real sales are fetched from Supabase.
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

export const salesReports: SalesReportRow[] = [];
