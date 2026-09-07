export type TransactionStatus = "Completed" | "Ongoing" | "Scheduled" | "Cancelled";

export type TransactionReportRow = {
  id: string;
  petName: string;
  ownerName: string;
  service: string;
  amount: number;
  date: string; // ISO
  displayDate: string;
  status: TransactionStatus;
};

export const transactionReports: TransactionReportRow[] = [
  { id: "TX-1001", petName: "Cody", ownerName: "Kate Palcis", service: "Premium Grooming", amount: 850, date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Completed" },
  { id: "TX-1002", petName: "Max", ownerName: "Josh Hernandez", service: "Overnight Boarding", amount: 650, date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Ongoing" },
  { id: "TX-1003", petName: "Bella", ownerName: "Anna Reyes", service: "Consultation", amount: 300, date: "2026-07-21", displayDate: "Jul 21, 2026", status: "Scheduled" },
  { id: "TX-1004", petName: "Luna", ownerName: "Maria Santos", service: "Diamond Grooming", amount: 1100, date: "2026-07-20", displayDate: "Jul 20, 2026", status: "Completed" },
  { id: "TX-1005", petName: "Irish", ownerName: "Ani Landrito", service: "Small Kennel Boarding", amount: 1020, date: "2026-07-19", displayDate: "Jul 19, 2026", status: "Cancelled" },
  { id: "TX-1006", petName: "Ceddy", ownerName: "Josh Hernandez", service: "Premium Grooming", amount: 850, date: "2026-07-19", displayDate: "Jul 19, 2026", status: "Completed" },
];
