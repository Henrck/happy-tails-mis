// Service Reports and Transaction Reports are two different views of the
// SAME real data (appointments) — Service Reports just doesn't show the
// amount column. Rather than two separate fetches/mappings that could
// drift out of sync, this fetches once via the existing, already-correct
// fetchAppointments() (same helper Appointment Management uses — reuses
// its joins to pets/packages/kennels/groomers instead of duplicating
// that query logic) and flattens to ONE row per pet per appointment,
// matching the granularity the mock data always had.
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

function serviceLabel(appt: AppointmentRow, pet: AppointmentRow["pets"][number]): string {
  if (pet.packageName) return pet.packageName;
  if (appt.service_type === "boarding") {
    return pet.packagePricingLabel ? `Boarding – ${pet.packagePricingLabel}` : "Boarding";
  }
  // Fallback: humanize the raw service_type (e.g. "dog_grooming" -> "Dog Grooming")
  return appt.service_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function fetchServiceAndTransactionReports() {
  const { rows, error } = await fetchAppointments();
  if (error) return { service: [] as ServiceReport[], transaction: [] as TransactionReportRow[], error };

  const service: ServiceReport[] = [];
  const transaction: TransactionReportRow[] = [];

  rows.forEach((appt) => {
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
        // A multi-pet appointment's total_amount is split across its
        // pets — line_amount is what THIS pet actually cost, which is
        // the correct number for a per-row transaction report (summing
        // it back up across all pets on an appointment reproduces
        // total_amount exactly).
        amount: pet.lineAmount,
        date: appt.scheduled_date,
        displayDate: displayDate(appt.scheduled_date),
        status,
      });
    });
  });

  return { service, transaction, error: null };
}
