// Service reports use permanent per-pet service codes and stable, human-readable
// appointment numbers. UUIDs remain the database's internal relationship keys.
import { createClient } from "./client";
import { fetchAppointments, type AppointmentRow } from "./appointment-management";
import type { AppointmentStatus, AppointmentServiceType } from "@/lib/types/appointments";
import type { ServiceReport, ReportStatus, ServiceCategory } from "@/lib/data/service-reports-mock";

function mapStatus(status: AppointmentStatus): ReportStatus {
  switch (status) {
    case "completed": return "Completed";
    case "checked_in": return "Ongoing";
    case "cancelled": return "Cancelled";
    case "pending":
    case "confirmed":
    default: return "Scheduled";
  }
}

function categoryForService(type: AppointmentServiceType): ServiceCategory {
  switch (type) {
    case "boarding": return "Boarding";
    case "ala_carte": return "Ala Carte";
    case "dog_grooming":
    case "cat_grooming": return "Grooming";
  }
}

function serviceLabel(appt: AppointmentRow, pet: AppointmentRow["pets"][number]): string {
  if (pet.packageName) return pet.packageName;
  if (appt.service_type === "boarding") {
    return pet.packagePricingLabel ? `Boarding – ${pet.packagePricingLabel}` : "Boarding";
  }
  return appt.service_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

/** Database-assigned identifiers never depend on UI sorting, filtering, or pagination. */
export async function fetchServiceReports(): Promise<{ rows: ServiceReport[]; error: string | null }> {
  const { rows: appointments, error } = await fetchAppointments();
  if (error) return { rows: [], error };
  if (appointments.length === 0) return { rows: [], error: null };

  const petRowIds = appointments.flatMap((a) => a.pets.map((p) => p.appointmentPetId));
  const supabase = createClient();
  const codes = new Map<string, string>();
  for (let start = 0; start < petRowIds.length; start += 150) {
    const ids = petRowIds.slice(start, start + 150);
    const { data, error: codeError } = await supabase
      .from("appointment_pets")
      .select("id, report_code")
      .in("id", ids);
    if (codeError) return { rows: [], error: `Could not load service IDs: ${codeError.message}. Apply the report-code SQL migration first.` };
    for (const pet of data ?? []) if (pet.report_code) codes.set(pet.id, pet.report_code);
  }

  // A second, bounded lookup keeps the normal appointment loader unchanged.
  // appointment_number is the permanent public-facing integer; id remains UUID.
  const appointmentNumbers = new Map<string, string>();
  for (let start = 0; start < appointments.length; start += 150) {
    const ids = appointments.slice(start, start + 150).map((a) => a.id);
    const { data, error: numberError } = await supabase
      .from("appointments")
      .select("id, appointment_number")
      .in("id", ids);
    if (numberError) {
      return { rows: [], error: `Could not load appointment numbers: ${numberError.message}. Apply the sequential appointment-number SQL migration first.` };
    }
    for (const appointment of data ?? []) {
      if (appointment.appointment_number !== null && appointment.appointment_number !== undefined) {
        appointmentNumbers.set(appointment.id, String(appointment.appointment_number));
      }
    }
  }

  const newestFirst = [...appointments].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return diff || b.scheduled_date.localeCompare(a.scheduled_date);
  });

  const rows: ServiceReport[] = [];
  for (const appt of newestFirst) {
    const appointmentNumber = appointmentNumbers.get(appt.id);
    if (!appointmentNumber) return { rows: [], error: `Appointment number missing for ${appt.id}. Check the sequential appointment-number migration and table permissions.` };
    for (const pet of appt.pets) {
      const reportCode = codes.get(pet.appointmentPetId);
      if (!reportCode) return { rows: [], error: `Service ID missing for appointment ${appointmentNumber}. Check the report-code migration and table permissions.` };
      rows.push({
        id: reportCode,
        appointmentId: appointmentNumber,
        appointmentPetId: pet.appointmentPetId,
        pet: pet.name,
        owner: appt.owner_name || "—",
        category: categoryForService(appt.service_type),
        service: serviceLabel(appt, pet),
        source: appt.is_walk_in ? "Walk-in" : "Online",
        amount: pet.lineAmount,
        date: appt.scheduled_date,
        displayDate: displayDate(appt.scheduled_date),
        status: mapStatus(pet.status ?? appt.status),
      });
    }
  }
  return { rows, error: null };
}
