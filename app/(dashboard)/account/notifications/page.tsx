"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, subscribeToNotifications } from "@/lib/supabase/notifications";
import type { Notification } from "@/lib/types/notifications";
import CustomerAppointmentDetailModal from "@/components/dashboard/CustomerAppointmentDetailModal";
const PAGE_SIZE = 10;
function relativeTime(iso: string) {
 const m = Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));
 if(m<1)return "Just now";if(m<60)return `${m}m ago`;if(m<1440)return `${Math.round(m/60)}h ago`;
 return new Date(iso).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
}
export default function NotificationsPage(){
 const [items,setItems]=useState<Notification[]>([]),[userId,setUserId]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[page,setPage]=useState(1),[viewingId,setViewingId]=useState<string|null>(null);
 const load=useCallback(async(id:string)=>{const r=await fetchNotifications(id);if(r.error){setError(r.error);return;}setItems(r.notifications);setError(null)},[]);
 useEffect(()=>{let active=true;void(async()=>{const {data:{user}}=await createClient().auth.getUser();if(!active)return;if(user){setUserId(user.id);await load(user.id)}if(active)setLoading(false)})();return()=>{active=false}},[load]);
 useEffect(()=>{if(!userId)return;return subscribeToNotifications(userId,()=>{void load(userId)})},[userId,load]);
 const unread=items.filter(x=>!x.read).length,pageCount=Math.max(1,Math.ceil(items.length/PAGE_SIZE)),currentPage=Math.min(page,pageCount);
 async function open(n:Notification){
  if(n.appointment_id)setViewingId(n.appointment_id);
  if(n.read)return;
  const {error:err}=await markNotificationRead(n.id);
  if(err){setError(err);return;}
  setItems(prev=>prev.map(x=>x.id===n.id?{...x,read:true}:x));
 }
 async function markAll(){if(!userId)return;const r=await markAllNotificationsRead(userId);if(r.error){setError(r.error);return;}setItems(prev=>prev.map(x=>({...x,read:true})))}
 return <section className="mx-auto w-full max-w-4xl px-1 pb-8">
  <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-zinc-800">Notifications</h1>{unread>0&&<button type="button" onClick={()=>void markAll()} className="text-sm font-semibold text-brand-pink">Mark all as read ({unread})</button>}</div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {loading?<p className="mt-6 text-zinc-500">Loading notifications…</p>:items.length===0?<p className="mt-6 rounded-2xl bg-pink-50 p-8 text-center text-zinc-500">No notifications yet.</p>:<>
   <div className="mt-5 space-y-3">{items.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE).map(n=><button type="button" key={n.id} onClick={()=>void open(n)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors hover:border-brand-pink ${n.read?"border-zinc-100 bg-white":"border-pink-200 bg-brand-tint"}`}>
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${n.title.toLowerCase().includes("cancel")?"bg-red-100 text-red-600":"bg-pink-100 text-brand-pink"}`} aria-hidden="true">{n.title.toLowerCase().includes("cancel")?"×":"✓"}</span>
    <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-zinc-800">{n.title}</strong>{!n.read&&<span className="h-2 w-2 rounded-full bg-brand-pink"/>}</span><span className="mt-1 block break-words text-sm text-zinc-600">{n.message}</span><span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">{relativeTime(n.created_at)}{n.appointment_id&&<span className="font-semibold text-brand-pink">View appointment details →</span>}</span></span>
   </button>)}</div>
   {pageCount>1&&<nav aria-label="Notifications pagination" className="mt-6 flex flex-wrap items-center justify-center gap-2"><button disabled={currentPage===1} onClick={()=>setPage(x=>Math.max(1,x-1))} className="rounded-full border border-pink-200 px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="px-2 text-sm text-zinc-500">Page {currentPage} of {pageCount}</span><button disabled={currentPage===pageCount} onClick={()=>setPage(x=>Math.min(pageCount,x+1))} className="rounded-full border border-pink-200 px-4 py-2 text-sm disabled:opacity-40">Next</button></nav>}
  </>}
  {viewingId&&<CustomerAppointmentDetailModal appointmentId={viewingId} onClose={()=>setViewingId(null)}/>}
 </section>;
}
