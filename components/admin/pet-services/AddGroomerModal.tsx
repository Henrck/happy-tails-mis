"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";
import type { Groomer } from "@/lib/types/pet-services";

export default function AddGroomerModal({groomers,onClose,onAdd,onArchiveToggle}:{
  groomers:Groomer[];
  onClose:()=>void;
  onAdd:(name:string)=>Promise<string|null>;
  onArchiveToggle:(id:string,currentStatus:"active"|"archived")=>void;
}){
  const [name,setName]=useState("");
  const [adding,setAdding]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [pending,setPending]=useState<Groomer|null>(null);
  const active=groomers.filter(g=>g.status==="active").length;
  async function add(){
    if(adding||!name.trim())return;
    setAdding(true);setError(null);
    try{const message=await onAdd(name.trim());if(message)setError(message);else setName("");}
    catch(e){setError(e instanceof Error?e.message:"Unable to add groomer.");}
    finally{setAdding(false);}
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
    <section role="dialog" aria-modal="true" aria-label="Groomer availability" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
      <header className="flex items-center justify-between bg-brand-pink px-6 py-4 text-white"><h2 className="flex items-center gap-2 font-bold"><Users size={18}/> Groomer Availability</h2><button type="button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
      <div className="space-y-4 p-5">
        <p className="rounded-xl bg-pink-50 p-3 text-sm text-zinc-700"><strong>{active} active groomer{active!==1?"s":""}</strong>. Each active groomer contributes one available pet start slot per 30-minute Grooming time slot.</p>
        <div className="flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void add();}} placeholder="New groomer name" className="min-w-0 flex-1 rounded-xl border border-pink-200 px-3 py-2 text-sm"/>
          <button type="button" disabled={adding||!name.trim()} onClick={()=>void add()} className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{adding?"Adding…":"Add"}</button></div>
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="max-h-72 space-y-2 overflow-y-auto">{groomers.map(g=><div key={g.id} className="flex items-center justify-between gap-3 rounded-xl border border-pink-100 p-3"><div><p className="text-sm font-semibold">{g.name}</p><p className={`text-xs ${g.status==="active"?"text-emerald-700":"text-zinc-500"}`}>{g.status==="active"?"Active · counts toward capacity":"Off duty · no new slot capacity"}</p></div>
          <button type="button" onClick={()=>setPending(g)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${g.status==="active"?"border-rose-300 text-rose-700":"border-emerald-300 text-emerald-700"}`}>{g.status==="active"?"Set Off Duty":"Set Active"}</button></div>)}
        </div>
        <p className="text-xs leading-5 text-zinc-500">Changes affect future booking capacity immediately. Existing booked appointments are retained.</p>
      </div>
      {pending&&<div className="sticky bottom-0 border-t border-pink-100 bg-white p-4"><p className="text-sm font-semibold">{pending.status==="active"?"Mark off duty":"Reactivate"} {pending.name}?</p><p className="mt-1 text-xs text-zinc-500">New Grooming bookings will use the updated number of active groomers.</p><div className="mt-3 flex gap-2"><button type="button" onClick={()=>setPending(null)} className="flex-1 rounded-full border border-pink-200 p-2 text-sm font-semibold">Cancel</button><button type="button" onClick={()=>{onArchiveToggle(pending.id,pending.status);setPending(null);}} className="flex-1 rounded-full bg-brand-pink p-2 text-sm font-semibold text-white">Confirm</button></div></div>}
    </section>
  </div>;
}
