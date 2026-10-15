"use client";

import { useEffect, useState } from "react";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchGroomers } from "@/lib/supabase/pet-services";
import type { ServiceType, Package, PackageInclusion, PackagePricing, PetSize, Addon, AddonPrice } from "@/lib/types/services";
import type { Groomer } from "@/lib/types/pet-services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

type DataSet = { packages: Package[]; inclusions: PackageInclusion[]; pricing: PackagePricing[]; sizes: PetSize[]; addons: Addon[]; addonPrices: AddonPrice[] };
const empty: DataSet = {packages: [], inclusions: [], pricing: [], sizes: [], addons: [], addonPrices: []};

export default function CustomerGroomingPackagesStep({ serviceType, pets, selections, onChange, onBack, onNext }: {
  serviceType: "grooming" | "dog_grooming" | "cat_grooming";
  pets: Pet[]; selections: DraftPetSelection[];
  onChange: (selections: DraftPetSelection[]) => void;
  onBack: () => void; onNext: () => void;
}) {
  const [lookup, setLookup] = useState<Record<"dog_grooming" | "cat_grooming", DataSet>>({dog_grooming: empty,cat_grooming: empty});
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const kinds: ("dog_grooming" | "cat_grooming")[] = serviceType === "grooming" ? ["dog_grooming", "cat_grooming"] : [serviceType];
    Promise.all([
      Promise.all(kinds.map(async kind => {
        const [packages, sizes, addons] = await Promise.all([fetchPackagesFull(kind), fetchPetSizes(kind), fetchAddonsByCategory("Grooming Add-ons")]);
        return [kind, { packages: packages.packages.filter(p => p.is_active), inclusions: packages.inclusions, pricing: packages.pricing,
          sizes: sizes.sizes.filter(s => s.is_active), addons: addons.addons.filter(a => a.is_active), addonPrices: addons.prices }] as const;
      })), fetchGroomers({activeOnly:true})
    ]).then(([rows, groomersResult]) => {
      if (cancelled) return;
      setLookup(prev => ({...prev,...Object.fromEntries(rows)}));
      setGroomers(groomersResult.groomers);
    }).finally(() => {if (!cancelled) setLoading(false);});
    return () => {cancelled = true;};
  }, [serviceType]);
  const pet = pets[activeIndex];
  const data = lookup[pet?.species === "Cat" ? "cat_grooming" : "dog_grooming"];
  const current = pet ? selections.find(s => s.pet.id === pet.id) : undefined;
  const priceFor = (packageId: string, sizeId: string, label: string) =>
    data.pricing.find(p => p.package_id === packageId && (p.size_id === sizeId || p.size_label === label)) ??
    data.pricing.find(p => p.package_id === packageId && p.size_id === null);
  function calculate(sel: DraftPetSelection) {
    const size = data.sizes.find(s => s.id === sel.sizeId);
    let total = sel.packageId && sel.sizeId ? (priceFor(sel.packageId,sel.sizeId,size?.label ?? "")?.price ?? 0) : 0;
    for(const addonId of sel.addonIds) {
      total += (data.addonPrices.find(p=>p.addon_id===addonId && p.size_label===size?.label)
        ?? data.addonPrices.find(p=>p.addon_id===addonId))?.price ?? 0;
    }
    return total;
  }
  function patch(changes: Partial<DraftPetSelection>) {
    if (!pet) return;
    const base: DraftPetSelection = current ?? {pet, packageId:null, packagePricingId:null, sizeId:null, kennelId:null, groomerId:null, addonIds:[],lineAmount:0};
    const updated = {...base,...changes};
    updated.lineAmount = calculate(updated);
    onChange([...selections.filter(s=>s.pet.id!==pet.id),updated]);
  }
  if (loading) return <p className="py-16 text-center text-slate-500">Loading packages...</p>;
  if (!pet) return null;
  const allReady = pets.every(p => {const s=selections.find(x=>x.pet.id===p.id);return !!s?.packageId && !!s.sizeId;});
  return <section className="mx-auto max-w-3xl">
    <header className="text-center"><h2 className="text-2xl font-bold text-slate-800">Choose a Package</h2>
      <p className="mt-1 text-sm text-slate-500">Compare full package inclusions from Service Management for each pet.</p></header>
    <div className="mt-5 flex flex-wrap justify-center gap-2">{pets.map((p,i)=><button key={p.id} type="button" onClick={()=>setActiveIndex(i)}
      className={`rounded-full border-2 px-4 py-2 text-xs font-semibold ${i===activeIndex?"border-brand-pink bg-brand-pink text-white":"border-pink-100 text-slate-700"}`}>
      {p.name}{selections.find(s=>s.pet.id===p.id)?.packageId?" ✓":""}</button>)}</div>
    <div className="mt-5 rounded-2xl border border-pink-100 p-5"><h3 className="font-bold text-slate-800">{pet.name} <span className="font-normal text-slate-500">({pet.species})</span></h3>
      <p className="mt-5 font-bold text-slate-800">Select Package</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{data.packages.map(pkg=>{
        const active=current?.packageId===pkg.id;
        const inclusions=data.inclusions.filter(i=>i.package_id===pkg.id).sort((a,b)=>a.sort_order-b.sort_order);
        return <button type="button" key={pkg.id} aria-pressed={active} onClick={()=>patch({packageId:pkg.id,packagePricingId:null,sizeId:null})}
          className={`rounded-2xl border-2 p-4 text-left transition ${active?"border-brand-pink bg-pink-50":"border-pink-100 bg-white hover:border-brand-pink"}`}>
          <span className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800">{pkg.name}</span>{active&&<span className="text-sm font-bold text-brand-pink">✓</span>}</span>
          <span className="mt-3 block space-y-1">{inclusions.length>0?inclusions.map(item=><span key={item.id} className="block text-xs leading-5 text-slate-600">• {item.label}</span>):<span className="block text-xs text-slate-500">No inclusions specified</span>}</span>
        </button>;
      })}</div>
      {current?.packageId && <>
        <p className="mt-6 font-bold text-slate-800">Select Size</p>
        <div className="mt-2 flex flex-wrap gap-2">{data.sizes.map(size=>{
          const price=priceFor(current.packageId!,size.id,size.label);
          return <button type="button" key={size.id} aria-pressed={current.sizeId===size.id} onClick={()=>patch({sizeId:size.id})}
            className={`rounded-xl border-2 px-3 py-2 text-xs font-semibold ${current.sizeId===size.id?"border-brand-pink bg-brand-pink text-white":"border-pink-100 bg-white text-slate-700 hover:border-brand-pink"}`}>
            {size.label}{size.weight_range?` (${size.weight_range})`:""}{price?` · ₱${price.price.toLocaleString()}`:""}</button>;
        })}</div>
        <label className="mt-6 block text-sm font-bold text-slate-800">Select Groomer <span className="font-normal text-slate-400">(Optional)</span>
          <select value={current.groomerId??""} onChange={e=>patch({groomerId:e.target.value||null})} className="mt-2 block w-full rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm sm:w-72">
            <option value="">No preference</option>{groomers.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}
          </select></label>
        {data.addons.length>0&&<><p className="mt-6 font-bold text-slate-800">Add-ons <span className="text-sm font-normal text-slate-400">(Optional)</span></p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">{data.addons.map(addon=>{
            const checked=current.addonIds.includes(addon.id);
            const size=data.sizes.find(s=>s.id===current.sizeId);
            const price=data.addonPrices.find(p=>p.addon_id===addon.id && p.size_label===size?.label)??data.addonPrices.find(p=>p.addon_id===addon.id);
            return <button type="button" key={addon.id} aria-pressed={checked} onClick={()=>patch({addonIds:checked?current.addonIds.filter(id=>id!==addon.id):[...current.addonIds,addon.id]})}
              className={`rounded-xl border-2 p-3 text-left text-xs ${checked?"border-brand-pink bg-pink-50":"border-pink-100 hover:border-brand-pink"}`}>
              <span className="font-semibold text-slate-800">{addon.name}</span>{price&&<span className="ml-2 text-slate-500">₱{price.price.toLocaleString()}</span>}
            </button>;
          })}</div></>}
      </>}
    </div>
    <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="rounded-full border-2 border-pink-200 py-3 font-semibold text-brand-pink">Back</button>
      <button type="button" onClick={onNext} disabled={!allReady} className="rounded-full bg-brand-pink py-3 font-semibold text-white disabled:opacity-40">Next</button></div>
  </section>;
}
