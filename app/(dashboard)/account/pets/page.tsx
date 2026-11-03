"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
import { listArchivedCustomerPets, setCustomerPetArchived, type ArchivedPet } from "@/lib/supabase/customer-pet-archive";
import { insertCustomerPet } from "@/lib/utils/pet-size-guide";
import type { Pet } from "@/lib/types/appointments";
import Link from "next/link";
import { hasValidCustomerPhone } from "@/lib/utils/customer-phone";
import DashboardPetCard from "@/components/dashboard/DashboardPetCard";
import { CustomerPetFields, useCustomerPetForm, blankCustomerPet } from "@/components/dashboard/CustomerPetFields";

const PETS_PER_PAGE = 9;
function NewPetForm({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: () => void }) {
  const state = useCustomerPetForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !state.validate()) return;
    setSaving(true); setError("");
    const { form, size } = state;
    const { error: saveError } = await insertCustomerPet({ customer_id: customerId, name: form.name.trim(), species: form.species,
      breed: form.breed.trim(), size_label: size?.label ?? "Unclassified", weight_kg: form.weight.trim() ? Number(form.weight) : null, pet_size_id: size?.id ?? null,
      age: form.age.trim() ? Number(form.age) : null, sex: form.sex || null, vaccination_status: form.vaccination_status });
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    state.setForm(blankCustomerPet);
    onSaved();
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form noValidate onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="add-pet-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><h2 id="add-pet-title" className="text-xl font-bold">Add New Pet</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Close">✕</button></div>
      <CustomerPetFields state={state}/>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-5 py-3 text-sm">Cancel</button><button type="submit" disabled={saving || (!!state.form.weight.trim() ? false : state.loadingGuide || !!state.guideError)} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button></div>
    </form>
  </div>;
}
export default function PetsListPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [archived, setArchived] = useState<ArchivedPet[]>([]);
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [phoneComplete, setPhoneComplete] = useState(false);
  const [pending, setPending] = useState<{id:string;name:string;archive:boolean} | null>(null);
  const [saving, setSaving] = useState(false);
  const activePets = pets.filter(p => !(p as Pet & { archived_at?: string | null }).archived_at);
  const listLength = tab === "active" ? activePets.length : archived.length;
  const totalPages = Math.max(1, Math.ceil(listLength / PETS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PETS_PER_PAGE;
  const load = useCallback(async (id: string) => {
    const [result, archivedResult] = await Promise.all([fetchPetsByCustomer(id), listArchivedCustomerPets(id)]);
    if (result.error || archivedResult.error) setError(result.error ?? archivedResult.error ?? "Unable to load pets");
    else { setPets(result.pets); setArchived(archivedResult.pets); setError(""); }
  }, []);
  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const id = data.user?.id;
      if (id) {
        setUserId(id);
        const { data: contact } = await createClient().from("customers").select("phone_number").eq("id", id).maybeSingle();
        if (!active) return;
        setPhoneComplete(hasValidCustomerPhone(contact?.phone_number));
        await load(id);
      }
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);
  useEffect(() => { if (!userId) return; return subscribeToCustomerPets(userId, () => { void load(userId); }); }, [userId, load]);
  async function confirmAction() {
    if (!pending || saving) return;
    setSaving(true); setError("");
    const issue = await setCustomerPetArchived(pending.id, pending.archive);
    if (issue) setError(issue);
    else if (userId) await load(userId);
    setSaving(false); setPending(null);
  }
  return <div className="space-y-6 pb-8">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-pink">Happy Tails / Customer</p><h1 className="mt-1 text-3xl font-bold text-slate-800">My Pets</h1><p className="mt-1 text-sm text-zinc-500">Manage your registered pets and keep their details updated. You can archive a pet from its profile.</p></div>
      <button type="button" onClick={() => { if (phoneComplete) setOpen(true); }} disabled={!phoneComplete} className="rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">+ Add New Pet</button>
    </section>
    {!loading && !phoneComplete && <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Please <Link href="/account/profile" className="font-bold underline">add your phone number in My Account</Link> before registering a new pet. Your existing pet records remain accessible.</section>}
    <div className="flex flex-wrap gap-2" role="group" aria-label="Pet status"><button type="button" onClick={() => {setTab("active");setPage(1);}} aria-pressed={tab === "active"} className={`rounded-full px-5 py-2 text-sm font-semibold ${tab === "active" ? "bg-brand-pink text-white" : "border border-pink-200 bg-white text-brand-pink"}`}>Active ({activePets.length})</button><button type="button" onClick={() => {setTab("archived");setPage(1);}} aria-pressed={tab === "archived"} className={`rounded-full px-5 py-2 text-sm font-semibold ${tab === "archived" ? "bg-brand-pink text-white" : "border border-pink-200 bg-white text-brand-pink"}`}>Archived ({archived.length})</button></div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <p className="py-10 text-center text-zinc-500">Loading your pets…</p> : listLength === 0 ? <section className="rounded-2xl border border-pink-100 bg-white p-10 text-center text-zinc-600">{tab === "archived" ? "No archived pets." : "No active pets registered."}</section> : tab === "active" ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{activePets.slice(start,start+PETS_PER_PAGE).map(pet => <DashboardPetCard key={pet.id} pet={pet}/>)}</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{archived.slice(start,start+PETS_PER_PAGE).map(pet => <article key={pet.id} className="rounded-2xl border border-zinc-200 bg-white p-5"><p className="font-bold text-zinc-800">{pet.name}</p><p className="mt-1 text-sm text-zinc-500">{pet.species} · {pet.breed} · {pet.size_label}</p><p className="mt-2 text-xs text-zinc-500">Archived {pet.archived_at ? new Date(pet.archived_at).toLocaleDateString("en-PH") : ""}</p><button type="button" onClick={() => setPending({id:pet.id,name:pet.name,archive:false})} className="mt-4 rounded-full border border-brand-pink px-4 py-2 text-xs font-semibold text-brand-pink">Restore Pet</button></article>)}</div>}
    {!loading && listLength > PETS_PER_PAGE && <nav aria-label="Pet pages" className="flex items-center justify-center gap-3"><button type="button" disabled={currentPage===1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-full border px-4 py-2 disabled:opacity-40">Previous</button><span className="text-sm">Page {currentPage} of {totalPages}</span><button type="button" disabled={currentPage===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-full border px-4 py-2 disabled:opacity-40">Next</button></nav>}
    {open && userId && phoneComplete && <NewPetForm customerId={userId} onClose={()=>setOpen(false)} onSaved={()=>{setOpen(false);void load(userId);}}/>}
    {pending && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" aria-label={pending.archive?"Archive pet":"Restore pet"} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-zinc-800">{pending.archive?"Archive":"Restore"} {pending.name}?</h2><p className="mt-3 text-sm text-zinc-600">{pending.archive?"This pet will no longer appear in new booking selections. Previous appointments and records remain available. You can restore the pet later.":"The pet will become available for future bookings again."}</p><div className="mt-6 flex gap-3"><button type="button" disabled={saving} onClick={()=>setPending(null)} className="flex-1 rounded-full border px-4 py-3">Back</button><button type="button" disabled={saving} onClick={()=>void confirmAction()} className="flex-1 rounded-full bg-brand-pink px-4 py-3 font-semibold text-white disabled:opacity-40">{saving?"Saving…":pending.archive?"Archive Pet":"Restore Pet"}</button></div></div></div>}
  </div>;
}
