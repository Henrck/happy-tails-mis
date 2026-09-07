"use client";
// Same panel as before, now against real Customer accounts instead of
// the mock Owner entity. Only used on the Registered Owners tab —
// Walk-in Only pets don't have a Customer entity to browse by.
import { useState, useMemo } from "react";
import type { Customer } from "@/lib/types/users";
import type { Pet } from "@/lib/types/appointments";

export default function OwnerPanel({
  customers,
  pets,
  onSelectOwner,
  onShowAll,
}: {
  customers: Customer[];
  pets: Pet[];
  onSelectOwner: (customer: Customer) => void;
  onShowAll: () => void;
}) {
  const [search, setSearch] = useState("");

  const petCount = (customerId: string) => pets.filter((p) => p.customer_id === customerId).length;

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers
      .filter((c) => !q || c.full_name.toLowerCase().includes(q))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [customers, search]);

  return (
    <div className="w-full lg:w-72 shrink-0 bg-white rounded-2xl border border-pink-100 p-4">
      <h3 className="flex items-center gap-1.5 font-bold text-brand-pink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7" /></svg>
        Owner
      </h3>

      <div className="mt-3 relative">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search owners"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-pink-200 pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <button
        onClick={onShowAll}
        className="mt-3 w-full flex items-center justify-between bg-brand-pink text-white rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand-pink-dark transition-colors"
      >
        All Owners
        <span className="bg-white/25 text-xs font-bold px-2 py-0.5 rounded-full">{pets.length}</span>
      </button>

      <div className="mt-2 space-y-1.5 max-h-[calc(100vh-19.5rem)] overflow-y-auto pr-1">
        {filteredCustomers.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-6">No owners match your search.</p>
        ) : (
          filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelectOwner(customer)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-brand-tint transition-colors text-left"
            >
              <span className="flex items-center gap-2 text-sm text-zinc-700">
                <span className="w-6 h-6 rounded-full bg-brand-pink text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {customer.full_name.charAt(0)}
                </span>
                {customer.full_name}
              </span>
              <span className="bg-brand-pink text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                {petCount(customer.id)}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
