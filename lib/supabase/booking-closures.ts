import { createClient } from "@/lib/supabase/client";
export type BookingClosedDate = { date:string; name:string; category:"regular_holiday"|"special_non_working"|"exceptional_closure"; source:string|null };
export async function fetchBookingClosedDates():Promise<{dates:BookingClosedDate[];error:string|null}> {
  const {data,error}=await createClient().from("booking_closed_dates").select("date,name,category,source").order("date");
  return {dates:(data??[]) as BookingClosedDate[],error:error?.message??null};
}
export async function checkBookingClosedDate(date:string):Promise<{closed:boolean;name:string|null;error:string|null}> {
  const {data,error}=await createClient().from("booking_closed_dates").select("name").eq("date",date).maybeSingle();
  return {closed:!!data,name:data?.name??null,error:error?.message??null};
}
export async function addExceptionalClosure(date:string,name:string){
  const {error}=await createClient().from("booking_closed_dates").insert({date,name:name.trim(),category:"exceptional_closure"});
  return error?.message??null;
}
export async function deleteExceptionalClosure(date:string){
  const {error}=await createClient().from("booking_closed_dates").delete().eq("date",date).eq("category","exceptional_closure");
  return error?.message??null;
}
