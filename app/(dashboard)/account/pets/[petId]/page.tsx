"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer, updatePet } from "@/lib/supabase/appointments";
import type { Pet, Sex, Species } from "@/lib/types/appointments";

export default function PetDetailPage() {
  const params = useParams<{ petId: string }>();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [form, setForm] = useState({ name: "", species: "Dog" as Species, breed: "", size_label: "", sex: "" as "" | Sex, age: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { pets } = await fetchPetsByCustomer(user.id);
      const row = pets.find((p) => p.id === params.petId);
      if (row) {
        setPet(row);
        setForm({
          name: row.name,
          species: row.species,
          breed: row.breed,
          size_label: row.size_label,
          sex: row.sex ?? "",
          age: row.age == null ? "" : String(row.age),
        });
      }
      setLoading(false);
    }
    load();
  }, [params.petId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!pet) return;

    setSaving(true);
    setMessage("");

    const { error } = await updatePet(pet.id, {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim(),
      size_label: form.size_label.trim(),
      sex: form.sex || null,
      age: form.age ? Number(form.age) : null,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Pet profile updated successfully.");
      setPet({ ...pet, ...form, sex: form.sex || null, age: form.age ? Number(form.age) : null });
    }
    setSaving(false);
  }

  if (loading) return <p className="py-16 text-center text-zinc-400">Loading pet profile…</p>;
  if (!pet) return <p className="py-16 text-center text-zinc-500">Pet not found.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => router.push("/account/pets")} className="text-sm font-semibold text-brand-pink">← Back to My Pets</button>

      <div className="rounded-3xl bg-brand-pink p-6 text-white md:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl">{pet.species === "Dog" ? "🐶" : "🐱"}</div>
          <div>
            <p className="text-sm text-white/80">Pet Profile</p>
            <h1 className="text-2xl font-bold">{pet.name}</h1>
          </div>
        </div>
      </div>

      <form onSubmit={save} className="rounded-3xl border border-pink-100 bg-white p-6 md:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Pet name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Species</span>
            <select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value as Species })} className="w-full rounded-xl border px-4 py-3 text-sm">
              <option>Dog</option>
              <option>Cat</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Breed</span>
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Size</span>
            <input value={form.size_label} onChange={(e) => setForm({ ...form, size_label: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Sex</span>
            <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as "" | Sex })} className="w-full rounded-xl border px-4 py-3 text-sm">
              <option value="">Not specified</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700">Age</span>
            <input type="number" min="0" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
          </label>
        </div>

        {message && <p className={`mt-5 text-sm ${message.includes("successfully") ? "text-green-600" : "text-red-500"}`}>{message}</p>}

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className="rounded-xl bg-brand-pink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save Pet Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
