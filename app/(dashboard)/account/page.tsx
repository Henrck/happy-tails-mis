"use client";
// My Pets — the dashboard home.
//
// REAL FIX: this was a Server Component that fetched pets exactly once,
// when the page first rendered. A pet added afterward — via the
// walk-in flow in the admin POS, or even this same customer's own
// "Add New Pet" inside the Book Appointment wizard in a different tab —
// wouldn't show up here until the page was manually reloaded. Rebuilt
// as a client component with a real Supabase Realtime subscription
// (subscribeToCustomerPets), same pattern already proven on Appointment
// Management: any insert/update/delete on this customer's pets rows
// refetches automatically, no refresh needed.
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer, subscribeToCustomerPets } from "@/lib/supabase/appointments";
import type { Pet } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import DashboardPetCard from "@/components/dashboard/DashboardPetCard";

export default function MyPetsPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadPets = useCallback(async (id: string) => {
    const { pets: petRows } = await fetchPetsByCustomer(id);
    setPets(petRows);
  }, []);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Layout already guarantees a logged-in user with a real
      // customers row exists before this page can be reached — this
      // is just defensive, not the real auth gate.
      if (!user) { setLoading(false); return; }

      const { data: customerRow } = await supabase.from("customers").select("*").eq("id", user.id).single();
      setCustomer(customerRow);
      setUserId(user.id);
      await loadPets(user.id);
      setLoading(false);
    }
    init();
  }, [loadPets]);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = subscribeToCustomerPets(userId, () => loadPets(userId));
    return unsubscribe;
  }, [userId, loadPets]);

  const firstName = customer?.full_name?.split(" ")[0] ?? "there";

  if (loading) {
    return <p className="text-center text-zinc-400 py-16">Loading…</p>;
  }

  return (
    <div>
      <div className="bg-brand-pink rounded-3xl px-6 py-6 md:px-8 md:py-8 flex items-center justify-between overflow-hidden relative">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Welcome, {firstName}!!</h1>
          <p className="mt-1 text-white/90 text-sm">how your fur babies are doing today.</p>
          {customer?.customer_id && (
            <span className="mt-3 inline-block bg-white/20 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
              Client ID : {customer.customer_id}
            </span>
          )}
        </div>
        <div className="hidden sm:flex w-24 h-24 rounded-full bg-white/15 items-center justify-center text-5xl shrink-0">
          🐾
        </div>
      </div>

      {pets.length > 0 ? (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 font-bold text-zinc-800">
            <span className="text-lg">🐾</span> Your Registered Pets
          </h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <DashboardPetCard key={pet.id} pet={pet} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 bg-white rounded-2xl border-2 border-dashed border-pink-200 py-12 px-6 text-center">
          <p className="text-4xl">🐾</p>
          <p className="mt-2 font-semibold text-zinc-700">No pets registered yet</p>
          <p className="mt-1 text-sm text-zinc-500">Book an appointment and we'll add your pet's profile for you.</p>
        </div>
      )}
    </div>
  );
}
