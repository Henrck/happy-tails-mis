"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { addPet, fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
import type { Pet, Sex, Species } from "@/lib/types/appointments";
import DashboardPetCard from "@/components/dashboard/DashboardPetCard";

const emptyForm = {
  name: "",
  species: "Dog" as Species,
  breed: "",
  size_label: "",
  sex: "" as "" | Sex,
  age: "",
};

export default function PetsListPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async (id: string) => {
    const { pets: rows, error: fetchError } = await fetchPetsByCustomer(id);
    if (fetchError) {
      setLoadError("Unable to load your pets. Please refresh the page.");
      return;
    }
    setLoadError("");
    setPets(rows);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        setUserId(user.id);
        await load(user.id);
      }
      if (active) setLoading(false);
    }
    void init();
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToCustomerPets(userId, () => { void load(userId); });
    return unsubscribe;
  }, [userId, load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId || saving) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await addPet({
      customer_id: userId,
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim(),
      size_label: form.size_label.trim(),
      sex: form.sex || null,
      age: form.age ? Number(form.age) : null,
    });
    if (insertError) {
      setError(insertError.message);
    } else {
      setForm(emptyForm);
      setOpen(false);
      await load(userId);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-r from-pink-50 via-white to-pink-50 px-6 py-6 shadow-sm md:px-10 md:py-8">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-pink">Happy Tails / Customer</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">My Pets <span aria-hidden="true">🐾</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">View and manage your registered pets, keep their profiles updated, and book services for your furry companions.</p>
          </div>
          <button type="button" onClick={() => { setError(""); setOpen(true); }} className="relative shrink-0 rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">+ Add New Pet</button>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-pink-100/70" />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Registered Pets</h2>
            <p className="mt-1 text-sm text-slate-500">All pets linked to your customer account.</p>
          </div>
          {!loading && !loadError && <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-brand-pink ring-1 ring-pink-100">{pets.length} {pets.length === 1 ? "Pet" : "Pets"}</span>}
        </div>
        {loading ? (
          <div className="rounded-2xl border border-pink-100 bg-white p-12 text-center text-sm text-zinc-500">Loading your pets...</div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-white p-8 text-center text-sm text-red-600">{loadError}</div>
        ) : pets.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-pink-200 bg-white px-6 py-14 text-center">
            <div className="text-5xl">🐾</div>
            <h3 className="mt-3 font-bold text-zinc-800">No pets registered yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">Add your first pet so its profile is available for grooming and boarding bookings.</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-5 rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white">Add Your First Pet</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pets.map((pet) => <DashboardPetCard key={pet.id} pet={pet} />)}
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setOpen(false); }}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="add-pet-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 id="add-pet-title" className="text-xl font-bold text-zinc-800">Add New Pet</h2>
              <button type="button" disabled={saving} aria-label="Close add pet" onClick={() => setOpen(false)} className="text-2xl text-zinc-400 disabled:opacity-50">×</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="mb-1 block text-sm font-semibold text-zinc-700">Pet name</span><input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-sm font-semibold text-zinc-700">Species</span><select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as Species })} className="w-full rounded-xl border px-4 py-3 text-sm"><option>Dog</option><option>Cat</option></select></label>
              <label><span className="mb-1 block text-sm font-semibold text-zinc-700">Sex</span><select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as "" | Sex })} className="w-full rounded-xl border px-4 py-3 text-sm"><option value="">Not specified</option><option>Male</option><option>Female</option></select></label>
              <label><span className="mb-1 block text-sm font-semibold text-zinc-700">Breed</span><input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-sm font-semibold text-zinc-700">Size</span><input value={form.size_label} onChange={(e) => setForm({ ...form, size_label: e.target.value })} placeholder="e.g. Small" className="w-full rounded-xl border px-4 py-3 text-sm" /></label>
              <label><span className="mb-1 block text-sm font-semibold text-zinc-700">Age</span><input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" /></label>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-red-500">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setOpen(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold text-zinc-600 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving || !userId} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Add Pet"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
