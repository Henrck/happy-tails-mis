import { createClient } from "@/lib/supabase/client";

export async function rescheduleCustomerAppointment(appointmentId: string, scheduledDate: string, scheduledTime: string) {
  const { error } = await createClient().rpc("happytails_reschedule_customer_appointment", {
    p_appointment_id: appointmentId,
    p_date: scheduledDate,
    p_time: scheduledTime,
  });
  return { error: error?.message ?? null };
}
