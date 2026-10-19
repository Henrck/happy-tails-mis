import { createClient } from "./client";
export async function cancelStaffAppointment(appointmentId: string, reason: string): Promise<{ error: string | null }> {
 const clean = reason.trim();
 if (clean.length < 5 || clean.length > 500) return { error: "Enter a cancellation reason between 5 and 500 characters." };
 const { error } = await createClient().rpc("happytails_staff_cancel_appointment", { p_appointment_id: appointmentId, p_reason: clean });
 return { error: error?.message ?? null };
}
