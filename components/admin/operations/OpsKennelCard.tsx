import type {Kennel} from "@/lib/types/pet-services";
import type {BoardingSessionRow} from "@/lib/supabase/service-sessions";

export default function OpsKennelCard({kennel,session,onView,onRemove,onComplete,completing}:{kennel:Kennel;session?:BoardingSessionRow|null;onView:()=>void;onRemove:()=>void;onComplete:()=>void;completing?:boolean}){
 const occupied=!!session;
 const checkedIn=session?.stage==="checked_in";
 return <div className="bg-white rounded-2xl shadow-sm border border-pink-100 p-4 relative">
  <span className={`absolute top-4 right-4 w-3 h-3 rounded-full ${occupied?"bg-red-500":"bg-green-500"}`}/>
  <p className="font-semibold text-zinc-800">Kennel {kennel.number}</p><p className="mt-1.5 text-xs text-zinc-400">{occupied?"Occupied":"Available"}</p>
  {session&&<div className="mt-3 rounded-xl bg-purple-50 border border-purple-100 p-3"><p className="font-semibold text-sm">{session.petName}</p><p className="text-xs text-zinc-500">{session.breed}</p><span className="inline-block mt-2 text-[10px] font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">In Progress</span></div>}
  <div className="mt-3 flex gap-2">
   {occupied&&<button onClick={onView} className="flex-1 text-xs font-semibold border border-brand-pink text-brand-pink px-4 py-1 rounded-full">View Details</button>}
   {checkedIn&&<button onClick={onComplete} disabled={completing} className="flex-1 text-xs font-semibold bg-brand-pink text-white px-4 py-1 rounded-full disabled:opacity-50">{completing?"...":"Complete"}</button>}
  </div>
  {!occupied&&<button onClick={onRemove} className="mt-2 w-full text-xs font-semibold border border-red-400 text-red-500 px-4 py-1 rounded-full">Remove</button>}
 </div>
}