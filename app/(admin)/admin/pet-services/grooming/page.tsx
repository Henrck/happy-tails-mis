"use client";
import {useState,useEffect,useCallback} from "react";
import {useRouter} from "next/navigation";
import {fetchGroomers,addGroomer,setGroomerStatus} from "@/lib/supabase/pet-services";
import {fetchGroomingSessions,subscribeToServiceSessions,type GroomingSessionRow} from "@/lib/supabase/service-sessions";
import type {Groomer} from "@/lib/types/pet-services";
import SessionFilters,{type SessionFilterState} from "@/components/admin/pet-services/SessionFilters";
import HistoryModal from "@/components/admin/pet-services/HistoryModal";
import AddGroomerModal from "@/components/admin/pet-services/AddGroomerModal";
import SessionDetailsModal from "@/components/admin/pet-services/SessionDetailsModal";

export default function GroomingManagementPage(){
 const router=useRouter();const[groomers,setGroomers]=useState<Groomer[]>([]),[sessions,setSessions]=useState<GroomingSessionRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const[filters,setFilters]=useState<SessionFilterState>({search:"",status:"all",groomer:"all"}),[history,setHistory]=useState(false),[add,setAdd]=useState(false);
 const[viewing,setViewing]=useState<GroomingSessionRow|null>(null);
 const load=useCallback(async()=>{const[g,s]=await Promise.all([fetchGroomers(),fetchGroomingSessions()]);if(g.error||s.error){setError(g.error??s.error??"Unable to load grooming data.");return}setError(null);setGroomers(g.groomers);setSessions(s.sessions)},[]);
 useEffect(()=>{setLoading(true);load().finally(()=>setLoading(false))},[load]);
 useEffect(()=>subscribeToServiceSessions(load),[load]);
 const active=groomers.filter(g=>g.status==="active");
 const visible=sessions.filter(s=>(filters.groomer==="all"||s.groomerName===filters.groomer)&&(!filters.search||`${s.petName} ${s.ownerName}`.toLowerCase().includes(filters.search.toLowerCase())));
 async function addG(name:string){const r=await addGroomer(name);if(r.error)return r.error.message;await load();return null}
 async function toggle(id:string,status:"active"|"archived"){await setGroomerStatus(id,status==="active"?"archived":"active");await load()}
 return <div><h1 className="text-3xl font-bold text-brand-pink">Grooming Management</h1>{error&&<p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
 <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4"><div className="bg-white rounded-2xl border border-pink-100 p-4"><span className="text-sm font-semibold">Active Sessions</span><p className="text-2xl font-bold mt-1">{sessions.length}</p></div><div className="bg-white rounded-2xl border border-pink-100 p-4"><span className="text-sm font-semibold">Available Groomers</span><p className="text-2xl font-bold mt-1">{active.filter(g=>!sessions.some(s=>s.groomerId===g.id)).length}</p></div><div className="bg-white rounded-2xl border border-pink-100 p-4"><span className="text-sm font-semibold">Groomers</span><p className="text-2xl font-bold mt-1">{active.length}</p></div></div>
 <div className="mt-6 flex flex-wrap gap-3"><SessionFilters filters={filters} onChange={setFilters} groomerNames={active.map(g=>g.name)} onBack={()=>router.push("/admin/pet-services")} onOpenHistory={()=>setHistory(true)} historyCount={0}/><button onClick={()=>setAdd(true)} className="border-2 border-brand-pink text-brand-pink font-semibold text-sm px-5 py-2 rounded-full">Add Groomer</button></div>
 {loading?<p className="mt-10 text-center text-zinc-400">Loading…</p>:<div className="mt-6 space-y-6">{active.map(g=>{const ss=visible.filter(s=>s.groomerId===g.id);return <section key={g.id}><div className="flex justify-between"><div><h3 className="font-bold">{g.name} <span className="font-normal text-zinc-500">({ss.length}/1)</span></h3><p className="text-xs text-zinc-400">{ss.length?"In Progress":"Available"}</p></div><button onClick={()=>toggle(g.id,g.status)} className="text-xs border border-red-400 text-red-500 px-3 py-1 rounded-full">Archive</button></div>{ss.length?<div className="mt-3 grid sm:grid-cols-2 md:grid-cols-3 gap-4">{ss.map(s=><div key={s.appointmentPetId} className="bg-white rounded-2xl border border-pink-100 p-4"><div className="flex justify-between"><b>{s.petName}</b><span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full">In Progress</span></div><p className="text-xs text-zinc-500 mt-1">{s.breed}</p><p className="text-xs text-zinc-400 mt-2">Owner: {s.ownerName}</p><button onClick={()=>setViewing(s)} className="mt-3 w-full text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1 rounded-full">View Details</button></div>)}</div>:<div className="mt-3 rounded-2xl border border-dashed border-pink-200 p-5 text-sm text-zinc-400">No active pet session. Groomer is available.</div>}</section>})}</div>}
 {history&&<HistoryModal completedSessions={[]} onClose={()=>setHistory(false)}/>} {add&&<AddGroomerModal groomers={groomers} onClose={()=>setAdd(false)} onAdd={addG} onArchiveToggle={toggle}/>}
 {viewing&&<SessionDetailsModal appointmentId={viewing.appointmentId} appointmentPetId={viewing.appointmentPetId} onClose={()=>setViewing(null)}/>}
 </div>
}