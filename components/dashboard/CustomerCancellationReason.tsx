"use client";
import { useEffect, useState } from "react";
import { fetchStaffCancellationDetails, type StaffCancellationDetails } from "@/lib/supabase/appointment-cancellation-details";
export default function CustomerCancellationReason({appointmentId}:{appointmentId:string}){
 const [details,setDetails]=useState<StaffCancellationDetails|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;setLoading(true);void fetchStaffCancellationDetails(appointmentId).then(d=>{if(alive)setDetails(d)}).catch(e=>{if(alive)setError(e instanceof Error?e.message:"Unable to load cancellation details")}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[appointmentId]);
 return <section className="rounded-2xl border border-red-200 bg-red-50 p-4"><h4 className="font-bold text-red-800">Cancellation Details</h4>{loading?<p className="mt-2 text-sm text-red-700">Loading reason…</p>:error?<p role="alert" className="mt-2 text-sm text-red-700">{error}</p>:details?<><p className="mt-2 text-xs font-semibold text-red-700">Cancelled by HappyTails staff</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-800">Reason: {details.reason}</p><p className="mt-2 text-xs text-zinc-500">{new Date(details.cancelled_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"})}</p></>:<p className="mt-2 text-sm text-zinc-700">A cancellation reason is not available for this appointment.</p>}</section>;
}
