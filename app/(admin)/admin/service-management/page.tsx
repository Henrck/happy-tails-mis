"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory, togglePackageActive, toggleSizeActive, toggleAddonActive } from "@/lib/supabase/services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import ServiceTabs from "@/components/admin/services/ServiceTabs";
import PackageCard from "@/components/admin/services/PackageCard";
import SizeGuideTable from "@/components/admin/services/SizeGuideTable";
import AddOnsSection from "@/components/admin/services/AddOnsSection";
import PackageFormModal from "@/components/admin/services/PackageFormModal";
import SizeFormModal from "@/components/admin/services/SizeFormModal";
import AddOnFormModal from "@/components/admin/services/AddOnFormModal";
import { Archive, AlertTriangle, X, RotateCcw, PowerOff, CalendarDays } from "lucide-react";
import Link from "next/link";

type ConfirmationTarget = { kind: "package" | "size" | "addon"; id: string; name: string; action: "archive" | "deactivate" | "reactivate" };

export default function ServiceManagementPage() {
 const [tab,setTab]=useState<ServiceType>("dog_grooming"); const [search,setSearch]=useState("");
 const [packages,setPackages]=useState<Package[]>([]),[inclusions,setInclusions]=useState<PackageInclusion[]>([]),[pricing,setPricing]=useState<PackagePricing[]>([]),[sizes,setSizes]=useState<PetSize[]>([]),[addons,setAddons]=useState<Addon[]>([]),[addonPrices,setAddonPrices]=useState<AddonPrice[]>([]),[aLaCarteAddons,setALaCarteAddons]=useState<Addon[]>([]),[aLaCartePrices,setALaCartePrices]=useState<AddonPrice[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
 const [packageModal,setPackageModal]=useState<{mode:"add"|"edit";pkg?:Package}|null>(null),[sizeModal,setSizeModal]=useState<{mode:"add"|"edit";size?:PetSize}|null>(null),[addonModal,setAddonModal]=useState<{mode:"add"|"edit";addon?:Addon;categoryId:string}|null>(null);
 const [confirmationTarget,setConfirmationTarget]=useState<ConfirmationTarget|null>(null);
 const addonCategoryName=tab==="boarding"?"Boarding Add-ons":"Grooming Add-ons";
 const loadData=useCallback(async()=>{setLoading(true);setError(null);try {const [pk,sz,ad,ala]=await Promise.all([fetchPackagesFull(tab),tab!=="boarding"?fetchPetSizes(tab):Promise.resolve({sizes:[] as PetSize[],error:null}),fetchAddonsByCategory(addonCategoryName),fetchAddonsByCategory("Ala Carte")]);setPackages(pk.packages);setInclusions(pk.inclusions);setPricing(pk.pricing);setSizes(sz.sizes);setAddons(ad.addons);setAddonPrices(ad.prices);setALaCarteAddons(ala.addons);setALaCartePrices(ala.prices);const message=[pk.error,sz.error,ad.error,ala.error].filter(Boolean).join("; ");if(message)setError(message);}catch(e){setError(e instanceof Error?e.message:"Unable to load services");}finally{setLoading(false)}},[tab,addonCategoryName]);
 useEffect(()=>{void loadData()},[loadData]);
 useEffect(()=>{
   if(!confirmationTarget)return;
   function onKeyDown(event:KeyboardEvent){if(event.key==="Escape"&&!busy)setConfirmationTarget(null);}
   window.addEventListener("keydown",onKeyDown);
   return()=>window.removeEventListener("keydown",onKeyDown);
 },[confirmationTarget,busy]);
 function requestStatus(kind:ConfirmationTarget["kind"],id:string,name:string,isActive:boolean,action:ConfirmationTarget["action"]){
   if(busy||confirmationTarget)return;
   // Archiving and deactivating are valid only for active items; reactivation only for inactive ones.
   if(action==="reactivate" ? isActive : !isActive)return;
   setError(null);setNotice(null);
   setConfirmationTarget({kind,id,name,action});
 }
 function togglePackage(pkg:Package){requestStatus("package",pkg.id,pkg.name,pkg.is_active,pkg.is_active?"deactivate":"reactivate")}
 function toggleSize(size:PetSize){requestStatus("size",size.id,size.label,size.is_active,size.is_active?"deactivate":"reactivate")}
 function toggleAddon(addon:Addon){requestStatus("addon",addon.id,addon.name,addon.is_active,addon.is_active?"deactivate":"reactivate")}
 function archivePackage(pkg:Package){requestStatus("package",pkg.id,pkg.name,pkg.is_active,"archive")}
 function archiveSize(size:PetSize){requestStatus("size",size.id,size.label,size.is_active,"archive")}
 function archiveAddon(addon:Addon){requestStatus("addon",addon.id,addon.name,addon.is_active,"archive")}
 async function confirmStatus(){
   if(!confirmationTarget||busy)return;
   const target=confirmationTarget;
   setBusy(true);setError(null);setNotice(null);
   try {
     const active=target.action==="reactivate";
     const result=target.kind==="package"?await togglePackageActive(target.id,active):target.kind==="size"?await toggleSizeActive(target.id,active):await toggleAddonActive(target.id,active);
     if(result.error)throw Error(result.error.message);
     setConfirmationTarget(null);
     await loadData();
     setNotice(`${target.name} ${target.action==="archive"?"archived":active?"reactivated":"deactivated"} successfully. Existing appointment records remain unchanged.`);
   }catch(e){setError(`Couldn't ${target.action} ${target.name}: ${e instanceof Error?e.message:"Please check database permissions."}`)}
   finally{setBusy(false)}
 }
 async function addAddon(categoryName:string){setError(null);const {data,error:e}=await createClient().from("addon_categories").select("id").eq("name",categoryName).single();if(e||!data){setError(e?.message??`Missing category: ${categoryName}`);return;}setAddonModal({mode:"add",categoryId:data.id});}
 const filtered=packages.filter(p=>p.name.toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="mx-auto max-w-7xl pb-12">
   <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-brand-pink">Service Management</h1><p className="mt-1 text-sm text-zinc-500">Manage packages, rates, and optional pet services.</p><Link href="/admin/calendar-management" className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-brand-pink bg-white px-5 py-2 text-sm font-semibold text-brand-pink hover:bg-pink-50"><CalendarDays size={17}/> Calendar Management</Link></div><input aria-label="Search packages" placeholder="Search packages…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-xs rounded-full border border-pink-200 bg-white px-4 py-2 text-sm"/></div>
   <div className="mt-6"><ServiceTabs active={tab} onChange={setTab}/></div>
   {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {notice&&!error&&<p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
   {loading?<p className="mt-8 text-zinc-500">Loading services…</p>:<>
     <section className="mt-7"><div className="flex items-center justify-between"><h2 className="font-bold text-zinc-800">Packages</h2><button type="button" disabled={busy} onClick={()=>setPackageModal({mode:"add"})} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink">+ Add Package</button></div><div className="mt-4 grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(pkg=><PackageCard key={pkg.id} pkg={pkg} inclusions={inclusions.filter(i=>i.package_id===pkg.id)} pricing={pricing.filter(p=>p.package_id===pkg.id)} onEdit={()=>setPackageModal({mode:"edit",pkg})} onToggleActive={()=>togglePackage(pkg)} onArchive={()=>archivePackage(pkg)}/>)}{filtered.length===0&&<p className="col-span-full py-10 text-center text-sm text-zinc-500">No packages found.</p>}</div></section>
     {tab!=="boarding"&&<section className="mt-10"><div className="flex items-center justify-between"><h2 className="font-bold text-zinc-800">Size Guide</h2><button type="button" onClick={()=>setSizeModal({mode:"add"})} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink">+ Add Size</button></div><div className="mt-4"><SizeGuideTable sizes={sizes} onEdit={size=>setSizeModal({mode:"edit",size})} onToggleActive={toggleSize} onArchive={archiveSize}/></div></section>}
     <section className="mt-10"><div className="mb-3 flex justify-end"><button type="button" onClick={()=>void addAddon(addonCategoryName)} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink">+ Add Add-on</button></div><AddOnsSection title={addonCategoryName} addons={addons} prices={addonPrices} onEdit={addon=>setAddonModal({mode:"edit",addon,categoryId:addon.category_id})} onToggleActive={toggleAddon} onArchive={archiveAddon}/></section>
     <section className="mt-10"><div className="mb-3 flex justify-end"><button type="button" onClick={()=>void addAddon("Ala Carte")} className="rounded-full border-2 border-brand-pink px-5 py-2 text-sm font-semibold text-brand-pink">+ Add À La Carte</button></div><AddOnsSection title="Ala Carte" addons={aLaCarteAddons} prices={aLaCartePrices} onEdit={addon=>setAddonModal({mode:"edit",addon,categoryId:addon.category_id})} onToggleActive={toggleAddon} onArchive={archiveAddon}/></section>
   </>}
   {packageModal&&<PackageFormModal serviceType={tab} sizes={sizes} existing={packageModal.pkg} existingInclusions={packageModal.pkg?inclusions.filter(i=>i.package_id===packageModal.pkg!.id):undefined} existingPricing={packageModal.pkg?pricing.filter(p=>p.package_id===packageModal.pkg!.id):undefined} onClose={()=>setPackageModal(null)} onSaved={()=>{setPackageModal(null);void loadData()}}/>}
   {sizeModal&&<SizeFormModal serviceType={tab} existing={sizeModal.size} onClose={()=>setSizeModal(null)} onSaved={()=>{setSizeModal(null);void loadData()}}/>}
   {addonModal&&<AddOnFormModal categoryId={addonModal.categoryId} existing={addonModal.addon} existingPrices={addonModal.addon?[...addonPrices,...aLaCartePrices].filter(p=>p.addon_id===addonModal.addon!.id):undefined} onClose={()=>setAddonModal(null)} onSaved={()=>{setAddonModal(null);void loadData()}}/>}
   {confirmationTarget&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmationTarget(null)}}>
     <div role="alertdialog" aria-modal="true" aria-labelledby="service-confirm-title" aria-describedby="service-confirm-description" className="w-full max-w-md overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-2xl">
       <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
         <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${confirmationTarget.action==="reactivate"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-600"}`}>
           {confirmationTarget.action==="archive"?<Archive size={23}/>:confirmationTarget.action==="reactivate"?<RotateCcw size={23}/>:<PowerOff size={23}/>}
         </span>
         <button type="button" disabled={busy} onClick={()=>setConfirmationTarget(null)} aria-label="Close confirmation" className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-pink-50 hover:text-brand-pink disabled:opacity-40"><X size={19}/></button>
       </div>
       <div className="px-5 pt-4 sm:px-6">
         <h2 id="service-confirm-title" className="text-xl font-extrabold text-zinc-800">{confirmationTarget.action==="archive"?"Archive":confirmationTarget.action==="reactivate"?"Reactivate":"Deactivate"} {confirmationTarget.kind==="package"?"Package":confirmationTarget.kind==="size"?"Pet Size":"Add-on"}?</h2>
         <p id="service-confirm-description" className="mt-2 break-words text-sm leading-6 text-zinc-600">
           {confirmationTarget.action==="reactivate"?"Are you sure you want to reactivate ":confirmationTarget.action==="archive"?"Are you sure you want to archive ":"Are you sure you want to deactivate "}
           <strong className="text-zinc-800">{confirmationTarget.name}</strong>?
           {confirmationTarget.action==="reactivate"?" It will become available for new bookings again.":" It will no longer be available for new bookings. Existing appointment and transaction history will be preserved."}
         </p>
         <div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><span>{confirmationTarget.action==="reactivate"?"Review package rates and availability before confirming. Existing bookings are not modified.":"You can reactivate the item later. Existing bookings will not be deleted."}</span></div>
         {error&&<p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
       </div>
       <div className="mt-6 grid grid-cols-2 gap-3 border-t border-pink-100 px-5 py-4 sm:px-6">
         <button type="button" disabled={busy} onClick={()=>setConfirmationTarget(null)} className="min-h-11 rounded-full border-2 border-pink-200 px-4 text-sm font-bold text-brand-pink hover:bg-pink-50 disabled:opacity-40">Cancel</button>
         <button type="button" disabled={busy} onClick={()=>void confirmStatus()} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-pink px-4 text-sm font-bold text-white hover:bg-brand-pink-dark disabled:opacity-40">{busy?"Processing…":confirmationTarget.action==="archive"?"Archive Item":confirmationTarget.action==="reactivate"?"Reactivate Item":"Deactivate Item"}</button>
       </div>
     </div>
   </div>}
 </div>
}
