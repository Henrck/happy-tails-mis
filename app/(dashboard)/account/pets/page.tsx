"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
import { insertCustomerPet } from "@/lib/utils/pet-size-guide";
import type { Pet } from "@/lib/types/appointments";
import DashboardPetCard from "@/components/dashboard/DashboardPetCard";
import { CustomerPetFields, useCustomerPetForm, blankCustomerPet } from "@/components/dashboard/CustomerPetFields";

function NewPetForm({ customerId, onClose, onSaved }: { customerId: string; onClose: () => void; onSaved: () => void }) {
  const state = useCustomerPetForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !state.validate() || !state.size) return;
    setSaving(true); setError("");
    const { form, size } = state;
    const { error: saveError } = await insertCustomerPet({ customer_id: customerId, name: form.name.trim(), species: form.species,
      breed: form.breed.trim(), size_label: size.label, weight_kg: Number(form.weight), pet_size_id: size.id,
      age: Number(form.age), sex: form.sex || null });
    setSaving(false);
    if (saveError) { setError(saveError.message); return; }
    state.setForm(blankCustomerPet);
    onSaved();
  }
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form noValidate onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="add-pet-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><h2 id="add-pet-title" className="text-xl font-bold">Add New Pet</h2><button type="button" disabled={saving} onClick={onClose} aria-label="Close">✕</button></div>
      <CustomerPetFields state={state}/>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-5 py-3 text-sm">Cancel</button><button type="submit" disabled={saving || state.loadingGuide || !!state.guideError} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button></div>
    </form>
  </div>;
}

export default function PetsListPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (id: string) => {
    const result = await fetchPetsByCustomer(id);
    if (result.error) setError(result.error); else { setPets(result.pets); setError(""); }
  }, []);
  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const id = data.user?.id;
      if (id) { setUserId(id); await load(id); }
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);
  useEffect(() => { if (!userId) return; return subscribeToCustomerPets(userId, () => { void load(userId); }); }, [userId, load]);
  return <div className="space-y-6 pb-8">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-pink">Happy Tails / Customer</p><h1 className="mt-1 text-3xl font-bold text-slate-800">My Pets</h1><p className="mt-1 text-sm text-zinc-500">Manage your registered pets and keep their details updated.</p></div>
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white">+ Add New Pet</button>
    </section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">{error}</p>}
    {loading ? <p className="py-10 text-center text-zinc-500">Loading your pets…</p> : pets.length === 0 ? <section className="rounded-2xl border border-pink-100 bg-white p-12 text-center"><p className="font-semibold text-zinc-700">No pets registered yet.</p><button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-brand-pink px-5 py-2 text-white">Add Pet</button></section> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{pets.map((pet) => <DashboardPetCard key={pet.id} pet={pet}/>)}</div>}
    {open && userId && <NewPetForm customerId={userId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void load(userId); }}/>}</div>;
}
