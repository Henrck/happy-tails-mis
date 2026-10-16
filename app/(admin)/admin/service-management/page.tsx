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

export default function ServiceManagementPage() {
 const [tab,setTab]=useState<ServiceType>("dog_grooming"); const [search,setSearch]=useState("");
 const [packages,setPackages]=useState<Package[]>([]),[inclusions,setInclusions]=useState<PackageInclusion[]>([]),[pricing,setPricing]=useState<PackagePricing[]>([]),[sizes,setSizes]=useState<PetSize[]>([]),[addons,setAddons]=useState<Addon[]>([]),[addonPrices,setAddonPrices]=useState<AddonPrice[]>([]),[aLaCarteAddons,setALaCarteAddons]=useState<Addon[]>([]),[aLaCartePrices,setALaCartePrices]=useState<AddonPrice[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
 const [packageModal,setPackageModal]=useState<{mode:"add"|"edit";pkg?:Package}|null>(null),[sizeModal,setSizeModal]=useState<{mode:"add"|"edit";size?:PetSize}|null>(null),[addonModal,setAddonModal]=useState<{mode:"add"|"edit";addon?:Addon;categoryId:string}|null>(null);
 const addonCategoryName=tab==="boarding"?"Boarding Add-ons":"Grooming Add-ons";
 const loadData=useCallback(async()=>{setLoading(true);setError(null);try {const [pk,sz,ad,ala]=await Promise.all([fetchPackagesFull(tab),tab!=="boarding"?fetchPetSizes(tab):Promise.resolve({sizes:[] as PetSize[],error:null}),fetchAddonsByCategory(addonCategoryName),fetchAddonsByCategory("Ala Carte")]);setPackages(pk.packages);setInclusions(pk.inclusions);setPricing(pk.pricing);setSizes(sz.sizes);setAddons(ad.addons);setAddonPrices(ad.prices);setALaCarteAddons(ala.addons);setALaCartePrices(ala.prices);const message=[pk.error,sz.error,ad.error,ala.error].filter(Boolean).join("; ");if(message)setError(message);}catch(e){setError(e instanceof Error?e.message:"Unable to load services");}finally{setLoading(false)}},[tab,addonCategoryName]);
 useEffect(()=>{void loadData()},[loadData]);
 async function updateStatus(label:string,active:boolean,fn:()=>PromiseLike<{error?:{message:string}|null;data?:unknown}>,verb:string){if(busy)return;setBusy(true);setError(null);setNotice(null);try {const result=await fn();if(result.error)throw Error(result.error.message);setNotice(`${label} ${verb}.`);await loadData();}catch(e){setError(`Couldn't update ${label}: ${e instanceof Error?e.message:"Please check database permissions."}`)}finally{setBusy(false)}}
 function togglePackage(pkg:Package){void updateStatus(pkg.name,!pkg.is_active,()=>togglePackageActive(pkg.id,!pkg.is_active),pkg.is_active?"deactivated":"reactivated")}
 function toggleSize(size:PetSize){void updateStatus(size.label,!size.is_active,()=>toggleSizeActive(size.id,!size.is_active),size.is_active?"deactivated":"reactivated")}
 function toggleAddon(addon:Addon){void updateStatus(addon.name,!addon.is_active,()=>toggleAddonActive(addon.id,!addon.is_active),addon.is_active?"deactivated":"reactivated")}
 function archivePackage(pkg:Package){if(!pkg.is_active||!window.confirm(`Archive “${pkg.name}”? This preserves existing appointment history.`))return;void updateStatus(pkg.name,false,()=>togglePackageActive(pkg.id,false),"archived")}
 function archiveSize(size:PetSize){if(!size.is_active||!window.confirm(`Archive “${size.label}”?`))return;void updateStatus(size.label,false,()=>toggleSizeActive(size.id,false),"archived")}
 function archiveAddon(addon:Addon){if(!addon.is_active||!window.confirm(`Archive “${addon.name}”?`))return;void updateStatus(addon.name,false,()=>toggleAddonActive(addon.id,false),"archived")}
 async function addAddon(categoryName:string){setError(null);const {data,error:e}=await createClient().from("addon_categories").select("id").eq("name",categoryName).single();if(e||!data){setError(e?.message??`Missing category: ${categoryName}`);return;}setAddonModal({mode:"add",categoryId:data.id});}
 const filtered=packages.filter(p=>p.name.toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="mx-auto max-w-7xl pb-12">
   <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-extrabold text-brand-pink">Service Management</h1><p className="mt-1 text-sm text-zinc-500">Manage packages, rates, and optional pet services.</p></div><input aria-label="Search packages" placeholder="Search packages…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full max-w-xs rounded-full border border-pink-200 bg-white px-4 py-2 text-sm"/></div>
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
 </div>
}
