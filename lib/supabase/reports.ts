// Service Reports and Transaction Reports use the same real appointments data.
// The report order is intentionally based on the appointment's CREATED_AT
// timestamp so the newest input appears first, regardless of the scheduled
// service date. This is different from appointment scheduling order.

import { fetchAppointments, type AppointmentRow } from "./appointment-management";
import type { AppointmentStatus } from "@/lib/types/appointments";
import type { ServiceReport, ReportStatus } from "@/lib/data/service-reports-mock";
import type { TransactionReportRow } from "@/lib/data/transaction-reports-mock";

function mapStatus(status: AppointmentStatus): ReportStatus {
  switch (status) {
    case "completed":
      return "Completed";
    case "checked_in":
      return "Ongoing";
    case "cancelled":
      return "Cancelled";
    case "pending":
    case "confirmed":
    default:
      return "Scheduled";
  }
}

function serviceLabel(
  appt: AppointmentRow,
  pet: AppointmentRow["pets"][number]
): string {
  if (pet.packageName) return pet.packageName;
  if (appt.service_type === "boarding") {
    return pet.packagePricingLabel
      ? `Boarding – ${pet.packagePricingLabel}`
      : "Boarding";
  }

  return appt.service_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function fetchServiceAndTransactionReports() {
  const { rows, error } = await fetchAppointments();

  if (error) {
    return {
      service: [] as ServiceReport[],
      transaction: [] as TransactionReportRow[],
      error,
    };
  }

  // IMPORTANT:
  // fetchAppointments() is primarily ordered for appointment scheduling
  // (scheduled date). Reports need a different priority: newest INPUT first.
  //
  // created_at is the actual time the appointment record was entered.
  // Sorting here keeps the appointment-management table's existing ordering
  // untouched while making Report Management prioritize the latest records.
  const latestFirst = [...rows].sort((a, b) => {
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();

    if (createdB !== createdA) return createdB - createdA;

    // Stable fallback if two records have the same created_at timestamp.
    return b.scheduled_date.localeCompare(a.scheduled_date);
  });

  const service: ServiceReport[] = [];
  const transaction: TransactionReportRow[] = [];

  latestFirst.forEach((appt) => {
    const status = mapStatus(appt.status);
    const owner = appt.owner_name || "—";

    appt.pets.forEach((pet, i) => {
      const rowId = `${appt.id.slice(0, 8).toUpperCase()}-${i + 1}`;
      const service_ = serviceLabel(appt, pet);

      service.push({
        id: rowId,
        pet: pet.name,
        owner,
        service: service_,
        date: appt.scheduled_date,
        displayDate: displayDate(appt.scheduled_date),
        status,
      });

      transaction.push({
        id: rowId,
        petName: pet.name,
        ownerName: owner,
        service: service_,
        amount: pet.lineAmount,
        date: appt.scheduled_date,
        displayDate: displayDate(appt.scheduled_date),
        status,
      });
    });
  });

  return { service, transaction, error: null };
}
