// Service Reports are the single operational view of Grooming, Boarding,
// and Ala Carte appointments. Transaction Reports (formerly duplicate data)
// has been merged into this view, including each pet's service charge.
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

/** Uses permanent per-pet IDs from the migration, never computes IDs from sorting. */
export async function fetchServiceReports(): Promise<{ rows: ServiceReport[]; error: string | null }> {
  const { rows: appointments, error } = await fetchAppointments();
  if (error) return { rows: [], error };

  const petRowIds = appointments.flatMap((a) => a.pets.map((p) => p.appointmentPetId));
  if (petRowIds.length === 0) return { rows: [], error: null };

  // Fetch report codes in bounded chunks so a big report won't create a huge
  // URL in the PostgREST .in() request. The original appointment loader stays
  // untouched for all other features.
  const supabase = createClient();
  const codes = new Map<string, string>();
  for (let start = 0; start < petRowIds.length; start += 150) {
    const ids = petRowIds.slice(start, start + 150);
    const { data, error: codeError } = await supabase
      .from("appointment_pets")
      .select("id, report_code")
      .in("id", ids);
    if (codeError) {
      return {
        rows: [],
        error: `Could not load service IDs: ${codeError.message}. Apply the report-code SQL migration first.`,
      };
    }
    for (const pet of data ?? []) {
      if (pet.report_code) codes.set(pet.id, pet.report_code);
    }
  }

  const newestFirst = [...appointments].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return diff || b.scheduled_date.localeCompare(a.scheduled_date);
  });

  const rows: ServiceReport[] = [];
  for (const appt of newestFirst) {
    for (const pet of appt.pets) {
      const reportCode = codes.get(pet.appointmentPetId);
      if (!reportCode) {
        return {
          rows: [],
          error: `Service ID missing for appointment ${appt.id}. Check the report-code migration and table permissions.`,
        };
      }
      rows.push({
        id: reportCode,
        appointmentId: appt.id,
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
