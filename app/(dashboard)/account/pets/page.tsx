"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
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
      age: form.age.trim() ? Number(form.age) : null, sex: form.sex || null });
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
      <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-xl border px-5 py-3 text-sm">Cancel</button><button type="submit" disabled={saving || (!!state.form.weight.trim() ? false : state.loadingGuide || !!state.guideError)} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button></div>
    </form>
  </div>;
}

export default function PetsListPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [phoneComplete, setPhoneComplete] = useState(false);
  const totalPages = Math.max(1, Math.ceil(pets.length / PETS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const visiblePets = pets.slice((currentPage - 1) * PETS_PER_PAGE, currentPage * PETS_PER_PAGE);
  const load = useCallback(async (id: string) => {
    const result = await fetchPetsByCustomer(id);
    if (result.error) setError(result.error); else { setPets(result.pets); setError(""); }
  }, []);
  useEffect(() => {
    let active = true;
    void createClient().auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const id = data.user?.id;
      if (id) {
        setUserId(id);
        const { data: contact } = await createClient().from("customers").select("phone_number").eq("id", id).maybeSingle();
        setPhoneComplete(hasValidCustomerPhone(contact?.phone_number));
        await load(id);
      }
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);
  useEffect(() => { if (!userId) return; return subscribeToCustomerPets(userId, () => { void load(userId); }); }, [userId, load]);
  return <div className="space-y-6 pb-8">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-brand-pink">Happy Tails / Customer</p><h1 className="mt-1 text-3xl font-bold text-slate-800">My Pets</h1><p className="mt-1 text-sm text-zinc-500">Manage your registered pets and keep their details updated.</p></div>
      <button type="button" onClick={() => { if (phoneComplete) setOpen(true); }} disabled={!phoneComplete} className="rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white">+ Add New Pet</button>
    </section>
    {!loading && !phoneComplete && <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Please <Link href="/account/profile" className="font-bold underline">add your phone number in My Account</Link> before registering a new pet. Your existing pet records remain accessible.</section>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-600">{error}</p>}
    {loading ? <p className="py-10 text-center text-zinc-500">Loading your pets…</p> : pets.length === 0 ? <section className="rounded-2xl border border-pink-100 bg-white p-12 text-center"><p className="font-semibold text-zinc-700">No pets registered yet.</p><button onClick={() => { if (phoneComplete) setOpen(true); }} disabled={!phoneComplete} className="mt-4 rounded-full bg-brand-pink px-5 py-2 text-white">Add Pet</button></section> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{visiblePets.map((pet) => <DashboardPetCard key={pet.id} pet={pet}/>)}</div>}
    {!loading && pets.length > PETS_PER_PAGE && (
      <nav aria-label="My Pets pagination" className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-3 sm:flex-row">
        <p className="text-xs font-medium text-zinc-500">
          Showing {(currentPage - 1) * PETS_PER_PAGE + 1}–{Math.min(currentPage * PETS_PER_PAGE, pets.length)} of {pets.length} pets
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => setPage((p) => Math.max(1, Math.min(p, totalPages) - 1))} disabled={currentPage === 1}
            className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
            <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-label={`Page ${pageNumber}`} aria-current={currentPage === pageNumber ? "page" : undefined}
              className={`h-8 min-w-8 rounded-full px-2 text-xs font-semibold transition-colors ${currentPage === pageNumber ? "bg-brand-pink text-white" : "border border-pink-200 bg-white text-brand-pink hover:bg-pink-50"}`}>{pageNumber}</button>
          ))}
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, Math.min(p, totalPages) + 1))} disabled={currentPage === totalPages}
            className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-brand-pink hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
        </div>
      </nav>
    )}
    {open && userId && phoneComplete && <NewPetForm customerId={userId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); void load(userId); }}/>}</div>;
}
