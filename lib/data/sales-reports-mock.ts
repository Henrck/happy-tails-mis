export type SalesReportRow = {
  invoiceNumber: string;
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  date: string; // ISO
  displayDate: string;
};

export const salesReports: SalesReportRow[] = [
  { invoiceNumber: "INV-3001", itemName: "Brit Canned Food", category: "Food", quantity: 4, unitPrice: 125, date: "2026-07-21", displayDate: "Jul 21, 2026" },
  { invoiceNumber: "INV-3002", itemName: "Whiskas (JR)", category: "Food", quantity: 6, unitPrice: 45, date: "2026-07-21", displayDate: "Jul 21, 2026" },
  { invoiceNumber: "INV-3003", itemName: "Pet Shampoo", category: "Grooming", quantity: 2, unitPrice: 220, date: "2026-07-20", displayDate: "Jul 20, 2026" },
  { invoiceNumber: "INV-3004", itemName: "Pup Cup", category: "Treats", quantity: 3, unitPrice: 80, date: "2026-07-20", displayDate: "Jul 20, 2026" },
  { invoiceNumber: "INV-3005", itemName: "Dog Leash", category: "Accessories", quantity: 1, unitPrice: 150, date: "2026-07-19", displayDate: "Jul 19, 2026" },
  { invoiceNumber: "INV-3006", itemName: "Nail Clipper", category: "Grooming", quantity: 2, unitPrice: 150, date: "2026-07-18", displayDate: "Jul 18, 2026" },
];
