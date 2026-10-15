"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import type { Groomer } from "@/lib/types/pet-services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

type GroomingChoice = ServiceType | "grooming";
type LookupSet = { packages: Package[]; inclusions: PackageInclusion[]; pricing: PackagePricing[]; sizes: PetSize[]; addons: Addon[]; addonPrices: AddonPrice[] };
const emptyLookup: LookupSet = { packages: [], inclusions: [], pricing: [], sizes: [], addons: [], addonPrices: [] };

// Resolve size using its saved database ID first, then the registered label.
// A missing or unrecognized registered size must not silently permit a lower quote.
type PetWithSize = Pet & { pet_size_id?: string | null; weight_kg?: number | null };
function normalizedSize(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^(?:size)/, "");
}
function minimumSizeIndex(pet: Pet, sizes: PetSize[]): number {
  const saved = pet as PetWithSize;
  if (saved.pet_size_id) {
    const byId = sizes.findIndex(s => s.id === saved.pet_size_id);
    if (byId >= 0) return byId;
  }
  const name = normalizedSize(pet.size_label ?? "");
  if (!name || ["unknown", "unclassified", "notset", "na"].includes(name)) return -1;
  const exact = sizes.findIndex(s => normalizedSize(s.label) === name);
  if (exact >= 0) return exact;
  const prefix = sizes.findIndex(s => {
    const label = normalizedSize(s.label);
    return name.startsWith(label) || label.startsWith(name);
  });
  return prefix >= 0 ? prefix : -2; // unresolved: require staff to correct the record
}

export default function GroomingSelectionStep({serviceType, pets, selections, onChange, onBack, onNext}: {
  serviceType: GroomingChoice;
  pets: Pet[];
  selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [lookupByService, setLookupByService] = useState<Record<ServiceType, LookupSet>>({dog_grooming: emptyLookup, cat_grooming: emptyLookup, boarding: emptyLookup});
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePetIdx, setActivePetIdx] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    const services: ServiceType[] = serviceType === "grooming" ? ["dog_grooming", "cat_grooming"] : [serviceType];
    const [results, groomerResult] = await Promise.all([
      Promise.all(services.map(async (type) => {
        const [pkg, size, addon] = await Promise.all([fetchPackagesFull(type), fetchPetSizes(type), fetchAddonsByCategory("Grooming Add-ons")]);
        return [type, {packages: pkg.packages.filter(p=>p.is_active), inclusions: pkg.inclusions, pricing: pkg.pricing, sizes: size.sizes.filter(s=>s.is_active), addons: addon.addons.filter(a=>a.is_active), addonPrices: addon.prices}] as const;
      })),
      fetchGroomers({activeOnly:true})
    ]);
    setLookupByService(prev=>{const next={...prev};for(const [type,data] of results)next[type]=data;return next;});
    setGroomers(groomerResult.groomers);
    setLoading(false);
  }, [serviceType]);
  useEffect(()=>{void loadData()},[loadData]);

  const activePet = pets[activePetIdx];
  const activeService: ServiceType = activePet?.species === "Cat" ? "cat_grooming" : "dog_grooming";
  const data = lookupByService[activeService];
  const minimum = activePet ? minimumSizeIndex(activePet, data.sizes) : -1;
  const activeSelection = selections.find(s=>s.pet.id===activePet?.id);

  function pricingRow(packageId: string, size: PetSize) {
    const rows=data.pricing.filter(row=>row.package_id===packageId);
    return rows.find(row=>row.size_id===size.id || row.size_label.trim().toLowerCase()===size.label.trim().toLowerCase()) ?? rows.find(row=>row.size_id===null);
  }
  function addonPrice(addonId:string,sizeLabel?:string) {
    const rows=data.addonPrices.filter(row=>row.addon_id===addonId);
    return rows.find(row=>sizeLabel && row.size_label.trim().toLowerCase()===sizeLabel.trim().toLowerCase()) ?? rows[0];
  }
  function computeAmount(sel:DraftPetSelection) {
    const size=data.sizes.find(s=>s.id===sel.sizeId);
    let amount=sel.packageId && size ? (pricingRow(sel.packageId,size)?.price ?? 0):0;
    for(const id of sel.addonIds)amount+=addonPrice(id,size?.label)?.price??0;
    return amount;
  }
  function updateSelection(patch:Partial<DraftPetSelection>) {
    if(!activePet)return;
    const existing=selections.find(s=>s.pet.id===activePet.id);
    const base:DraftPetSelection=existing??{pet:activePet,packageId:null,packagePricingId:null,sizeId:null,kennelId:null,groomerId:null,addonIds:[],lineAmount:0};
    const updated={...base,...patch};
    if(updated.sizeId){const index=data.sizes.findIndex(s=>s.id===updated.sizeId);if(minimum===-2 || index<minimum || index<0)return;}
    updated.lineAmount=computeAmount(updated);
    onChange([...selections.filter(s=>s.pet.id!==activePet.id),updated]);
  }
  function toggleAddon(id:string){if(!activeSelection)return;updateSelection({addonIds:activeSelection.addonIds.includes(id)?activeSelection.addonIds.filter(x=>x!==id):[...activeSelection.addonIds,id]});}
  const allConfigured=pets.every(p=>{const sel=selections.find(s=>s.pet.id===p.id);const lookup=lookupByService[p.species==="Cat"?"cat_grooming":"dog_grooming"];const index=lookup.sizes.findIndex(s=>s.id===sel?.sizeId);return !!sel?.packageId && index>=0 && minimumSizeIndex(p,lookup.sizes)!==-2 && index>=minimumSizeIndex(p,lookup.sizes)});
  if(loading)return <p className="py-16 text-center text-zinc-400">Loading grooming options…</p>;
  if(!activePet)return null;
  return <div className="mx-auto w-full max-w-3xl">
    <h2 className="text-center text-2xl font-bold text-brand-pink">{serviceType==="grooming"?"Grooming":activeService==="dog_grooming"?"Dog Grooming":"Cat Grooming"}</h2>
    <p className="mt-1 text-center text-sm text-zinc-500">Choose a package and a size for each pet. Final size and price are verified at the shop.</p>
    <div className="mt-5 flex flex-wrap justify-center gap-2">{pets.map((pet,idx)=><button key={pet.id} type="button" onClick={()=>setActivePetIdx(idx)} className={`rounded-full border-2 px-4 py-2 text-xs font-semibold ${idx===activePetIdx?"border-brand-pink bg-brand-pink text-white":"border-pink-100 bg-white text-zinc-600"}`}>{pet.species==="Cat"?"🐈":"🐕"} {pet.name} {selections.find(s=>s.pet.id===pet.id)?.packageId?"✓":""}</button>)}</div>
    <div className="mt-6 rounded-2xl border-2 border-pink-100 bg-white p-5">
      <p className="font-bold text-zinc-800">{activePet.name} <span className="font-normal text-zinc-400">({activePet.species})</span></p>
      <p className="mt-5 font-bold text-zinc-800">Select Package</p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">{data.packages.map(pkg=><button key={pkg.id} type="button" onClick={()=>updateSelection({packageId:pkg.id,packagePricingId:null,sizeId:null})} className={`rounded-xl border-2 p-3 text-left text-sm ${activeSelection?.packageId===pkg.id?"border-brand-pink bg-brand-tint":"border-pink-100 hover:border-brand-pink"}`}><p className="font-semibold text-zinc-800">{pkg.name}</p>{data.inclusions.filter(i=>i.package_id===pkg.id).map(i=><p key={i.id} className="mt-0.5 text-xs text-zinc-500">• {i.label}</p>)}</button>)}</div>
      {activeSelection?.packageId && <>
        <p className="mt-6 font-bold text-zinc-800">Select Size</p>
        <p className="mt-1 text-xs text-zinc-500">Registered size: <strong>{activePet.size_label||"Unclassified"}</strong>. {minimum===-2 ? "The saved size does not match the active size guide. Please ask staff to update this pet’s registered size." : "Smaller tiers are unavailable; you may choose the registered size or larger."}</p>
        <div className="mt-2 flex flex-wrap gap-2">{data.sizes.map((size,idx)=>{const disabled=minimum===-2 || idx<minimum;const price=pricingRow(activeSelection.packageId!,size);const selected=activeSelection.sizeId===size.id;return <button key={size.id} type="button" disabled={disabled} title={disabled?minimum===-2?"Registered size needs staff verification":`Unavailable: ${activePet.name} is registered as ${activePet.size_label}`:undefined} onClick={()=>updateSelection({sizeId:size.id,packagePricingId:price?.id??null})} className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold ${disabled?"cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 opacity-70":selected?"border-brand-pink bg-brand-pink text-white":"border-pink-200 text-zinc-700 hover:border-brand-pink"}`}>{size.label} {size.weight_range&&<span className="font-normal opacity-70">({size.weight_range})</span>}{price&&<span className="ml-1.5">₱{price.price}</span>}{disabled&&<span className="ml-1">· Unavailable</span>}</button>})}</div>
        <p className="mt-6 font-bold text-zinc-800">Select Groomer <span className="text-sm font-normal text-zinc-400">(Optional)</span></p>
        <select value={activeSelection.groomerId??""} onChange={e=>updateSelection({groomerId:e.target.value||null})} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-pink sm:w-64"><option value="">No preference</option>{groomers.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select>
        {data.addons.length>0&&<><p className="mt-6 font-bold text-zinc-800">Add-Ons <span className="text-sm font-normal text-zinc-400">(Optional)</span></p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{data.addons.map(addon=>{const size=data.sizes.find(s=>s.id===activeSelection.sizeId);const price=addonPrice(addon.id,size?.label);const selected=activeSelection.addonIds.includes(addon.id);return <button key={addon.id} type="button" onClick={()=>toggleAddon(addon.id)} className={`rounded-xl border-2 px-3 py-2 text-left text-xs ${selected?"border-brand-pink bg-brand-pink text-white":"border-pink-100 text-zinc-700 hover:border-pink-200"}`}><p className="font-semibold">{addon.name}</p>{price&&<p className={selected?"text-white/80":"text-zinc-400"}>₱{price.price}</p>}</button>})}</div></>}
      </>}
    </div>
    <div className="mt-8 flex gap-3"><button type="button" onClick={onBack} className="flex-1 rounded-full border-2 border-zinc-300 py-2.5 font-semibold text-zinc-500 hover:border-zinc-400">Back</button><button type="button" onClick={onNext} disabled={!allConfigured} className="flex-1 rounded-full bg-brand-pink py-2.5 font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-40">Next</button></div>
  </div>;
}
