import { createClient } from "./client";
export type StaffCancellationDetails = { reason: string; cancelled_at: string };
export async function fetchStaffCancellationDetails(appointmentId: string): Promise<StaffCancellationDetails | null> {
 const { data, error } = await createClient().from("appointment_staff_cancellations")
  .select("reason,cancelled_at").eq("appointment_id", appointmentId).maybeSingle();
 if (error) throw new Error(error.message);
 return data as StaffCancellationDetails | null;
}
