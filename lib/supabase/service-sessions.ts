import { createClient } from "./client";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { BoardingStage } from "@/lib/data/boarding-kennels-mock";
export type GroomingSessionRow = {
  appointmentId: string; appointmentPetId: string; petId: string; petName: string; breed: string;
  ownerName: string; scheduledDate: string; scheduledTime: string | null; groomerId: string; groomerName: string;
};
export type BoardingSessionRow = {
  appointmentId: string; appointmentPetId: string; petId: string; petName: string; breed: string;
  ownerName: string; dropOffAt: string | null; pickUpAt: string | null; kennelId: string;
  kennelSize: "small" | "big"; kennelNumber: number; stage: BoardingStage;
};
export async function fetchGroomingSessions() {
  const s = createClient();
  const { data, error } = await s.from("appointment_pets").select(`id,pet_id,groomer_id,appointments!inner(id,owner_name,scheduled_date,scheduled_time,status,service_type),pets(id,name,breed),groomers(id,name)`)
    .not("groomer_id", "is", null).eq("appointments.status", "checked_in")
    .in("appointments.service_type", ["dog_grooming", "cat_grooming", "ala_carte"]);
  if (error) return { sessions: [] as GroomingSessionRow[], error: error.message };
  return { sessions: ((data ?? []) as any[]).map(r => ({
    appointmentId: r.appointments.id, appointmentPetId: r.id, petId: r.pets?.id ?? r.pet_id,
    petName: r.pets?.name ?? "Unknown pet", breed: r.pets?.breed ?? "—", ownerName: r.appointments.owner_name,
    scheduledDate: r.appointments.scheduled_date, scheduledTime: r.appointments.scheduled_time,
    groomerId: r.groomers?.id ?? r.groomer_id, groomerName: r.groomers?.name ?? "Unassigned",
  })) as GroomingSessionRow[], error: null };
}
export async function fetchBoardingSessions() {
  const s = createClient();
  const { data, error } = await s.from("appointment_pets").select(`id,pet_id,kennel_id,appointments!inner(id,owner_name,drop_off_at,pick_up_at,status,service_type),pets(id,name,breed),kennels(id,size,number)`)
    .not("kennel_id", "is", null).in("appointments.status", ["confirmed", "checked_in"])
    .eq("appointments.service_type", "boarding").neq("status", "completed");
  if (error) return { sessions: [] as BoardingSessionRow[], error: error.message };
  return { sessions: ((data ?? []) as any[]).map(r => ({
    appointmentId: r.appointments.id, appointmentPetId: r.id, petId: r.pets?.id ?? r.pet_id,
    petName: r.pets?.name ?? "Unknown pet", breed: r.pets?.breed ?? "—", ownerName: r.appointments.owner_name,
    dropOffAt: r.appointments.drop_off_at, pickUpAt: r.appointments.pick_up_at,
    kennelId: r.kennels?.id ?? r.kennel_id, kennelSize: r.kennels?.size ?? "small",
    kennelNumber: r.kennels?.number ?? 0,
    stage: r.appointments.status === "confirmed" ? "booked" : "checked_in",
  })) as BoardingSessionRow[], error: null };
}
export async function fetchAvailableGroomers() {
  const s = createClient();
  const [{ data, error }, { sessions, error: se }] = await Promise.all([
    s.from("groomers").select("*").eq("status", "active").order("name"), fetchGroomingSessions(),
  ]);
  if (error || se) return { groomers: [] as Groomer[], error: error?.message ?? se };
  const busy = new Set(sessions.map(x => x.groomerId));
  return { groomers: ((data ?? []) as Groomer[]).filter(x => !busy.has(x.id)), error: null };
}
export async function fetchAvailableKennels() {
  const s = createClient();
  const [{ data, error }, { sessions, error: se }] = await Promise.all([
    s.from("kennels").select("*").eq("is_active", true).order("size").order("number"),
    fetchBoardingSessions(),
  ]);
  if (error || se) return { kennels: [] as Kennel[], error: error?.message ?? se };
  const busy = new Set(sessions.map(x => x.kennelId));
  return { kennels: ((data ?? []) as Kennel[]).filter(x => !busy.has(x.id)), error: null };
}
export async function checkInAppointment(id: string, assignments: { appointmentPetId: string; resourceId: string; resourceType: "groomer" | "kennel" }[]) {
  const s = createClient();
  if (!assignments.length) return { error: "Assign a resource to every pet before checking in." };
  const { data: a, error: ae } = await s.from("appointments").select("id,service_type,status").eq("id", id).single();
  if (ae || !a) return { error: ae?.message ?? "Appointment not found." };
  if (a.status !== "confirmed") return { error: "Only confirmed appointments can be checked in." };
  const type = a.service_type === "boarding" ? "kennel" : "groomer";
  if (assignments.some(x => x.resourceType !== type)) return { error: `This appointment requires ${type} assignment.` };
  if (new Set(assignments.map(x => x.appointmentPetId)).size !== assignments.length) return { error: "Each pet can only have one assignment." };
  if (type === "groomer" && new Set(assignments.map(x => x.resourceId)).size !== assignments.length) return { error: "A groomer cannot be assigned twice in the same check-in." };
  const active = type === "groomer" ? await fetchGroomingSessions() : await fetchBoardingSessions();
  if (active.error) return { error: active.error };
  const busy = new Set(active.sessions.filter(x => x.appointmentId !== id && (type === "groomer" || (x as BoardingSessionRow).stage === "checked_in")).map(x => type === "groomer" ? (x as GroomingSessionRow).groomerId : (x as BoardingSessionRow).kennelId));
  if (type === "groomer" && assignments.some(x => busy.has(x.resourceId))) return { error: "A selected groomer is already in use." };
  const { count, error: ce } = await s.from("appointment_pets").select("id", { head: true, count: "exact" }).eq("appointment_id", id);
  if (ce) return { error: ce.message };
  if (count !== assignments.length) return { error: "Assign every pet in this appointment." };
  if (type === "kennel") {
    const ids = assignments.map(x => x.appointmentPetId);
    const [{ data: petRows, error: pe }, { data: kennelRows, error: ke }] = await Promise.all([
      s.from("appointment_pets").select("id,kennel_id,package_id,package_pricing_id,packages(name),package_pricing(package_id,size_label,size_detail,packages(name))").eq("appointment_id", id).in("id", ids),
      s.from("kennels").select("id,size,is_active").in("id", assignments.map(x => x.resourceId)),
    ]);
    if (pe || ke) return { error: pe?.message ?? ke?.message ?? "Unable to verify kennels." };
    const pets = new Map((petRows ?? []).map((r: any) => [r.id, r]));
    const kennels = new Map((kennelRows ?? []).map((k: any) => [k.id, k]));
    for (const x of assignments) {
      const row: any = pets.get(x.appointmentPetId); const kennel: any = kennels.get(x.resourceId);
      if (!row || !kennel || kennel.is_active !== true) return { error: "The selected kennel is disabled or no longer exists." };
      if (row.kennel_id && row.kennel_id !== x.resourceId) return { error: "This pet already has a reserved kennel. Confirm the booked kennel instead of replacing it." };
      if (!row.kennel_id && busy.has(x.resourceId)) return { error: "This kennel is currently occupied. Choose another active kennel." };
      const description = `${row.packages?.name ?? row.package_pricing?.packages?.name ?? ""} ${row.package_pricing?.size_label ?? ""} ${row.package_pricing?.size_detail ?? ""}`.toLowerCase();
      const required = description.includes("small") ? "small" : description.includes("big") ? "big" : null;
      if (!required) return { error: "This booking has no recorded kennel size. Review the booking." };
      if (kennel.size !== required) return { error: `This pet requires a ${required} kennel.` };
    }
  }
  for (const x of assignments) {
    // Keep existing boarding reservation IDs unchanged. A new kennel is saved only when no reservation exists.
    if (type === "kennel") {
      const { error } = await s.from("appointment_pets").update({ kennel_id: x.resourceId }).eq("id", x.appointmentPetId).eq("appointment_id", id).is("kennel_id", null);
      if (error) return { error: error.message };
    } else {
      const { error } = await s.from("appointment_pets").update({ groomer_id: x.resourceId }).eq("id", x.appointmentPetId).eq("appointment_id", id);
      if (error) return { error: error.message };
    }
  }
  const { error } = await s.from("appointments").update({ status: "checked_in" }).eq("id", id);
  return { error: error?.message ?? null };
}
export function subscribeToServiceSessions(onChange: () => void) {
  const s = createClient(), ch = s.channel("pet-service-sessions-" + Math.random().toString(36).slice(2))
    .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "appointment_pets" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "groomers" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "kennels" }, onChange).subscribe();
  return () => { s.removeChannel(ch); };
}
