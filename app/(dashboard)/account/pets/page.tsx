"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { addPet, fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
import type { Pet, Sex, Species } from "@/lib/types/appointments";

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
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (id: string) => {
    const { pets: rows } = await fetchPetsByCustomer(id);
    setPets(rows);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      await load(user.id);
    }
    init();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToCustomerPets(userId, () => load(userId));
    return unsubscribe;
  }, [userId, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

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
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-800">My Pets</h1>
          <p className="mt-1 text-sm text-zinc-500">Keep your pets' profiles ready for future grooming and boarding bookings.</p>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
          + Add New Pet
        </button>
      </div>

      {pets.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-pink-200 bg-white px-6 py-14 text-center">
          <div className="text-5xl">🐾</div>
          <h2 className="mt-3 font-bold text-zinc-800">No pets registered yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">Add a pet profile once and it can be reused when you book services.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/account/pets/${pet.id}`} className="rounded-2xl border border-pink-100 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-2xl">{pet.species === "Dog" ? "🐶" : "🐱"}</div>
                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-brand-pink">{pet.species}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-zinc-800">{pet.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{pet.breed || "Breed not specified"}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <span>Age: {pet.age ?? "—"}</span>
                <span>Sex: {pet.sex ?? "—"}</span>
                <span className="col-span-2">Size: {pet.size_label || "—"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-800">Add New Pet</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-2xl text-zinc-400">×</button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Pet name</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Species</span>
                <select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as Species })} className="w-full rounded-xl border px-4 py-3 text-sm">
                  <option>Dog</option>
                  <option>Cat</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Sex</span>
                <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as "" | Sex })} className="w-full rounded-xl border px-4 py-3 text-sm">
                  <option value="">Not specified</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Breed</span>
                <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Size</span>
                <input value={form.size_label} onChange={(e) => setForm({ ...form, size_label: e.target.value })} placeholder="e.g. Small" className="w-full rounded-xl border px-4 py-3 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-zinc-700">Age</span>
                <input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
              </label>
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-5 py-3 text-sm font-semibold text-zinc-600">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Pet"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
