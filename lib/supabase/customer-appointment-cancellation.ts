import { createClient } from "@/lib/supabase/client";

/** The database RPC verifies customer ownership and permitted status atomically. */
export async function cancelCustomerAppointment(appointmentId:string, reason:string):Promise<{error:string|null}> {
  const clean=reason.trim();
  if(clean.length<5||clean.length>500)return {error:"Please provide a cancellation reason between 5 and 500 characters."};
  const {error}=await createClient().rpc("happytails_cancel_customer_appointment",{
    p_appointment_id:appointmentId,p_reason:clean
  });
  return {error:error?.message??null};
}
