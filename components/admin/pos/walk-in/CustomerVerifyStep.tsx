"use client";
// First screen of the walk-in flow: confirm whether this is an existing
// customer (search real customers table) or someone new (no account,
// just a name/contact/address for this booking). Doesn't create
// anything yet — just decides which path Pet Information takes later.
import { useState } from "react";
import { searchCustomers } from "@/lib/supabase/appointments";
import type { Customer } from "@/lib/types/users";

export default function CustomerVerifyStep({
  onSelectExisting,
  onNewCustomer,
}: {
  onSelectExisting: (customer: Customer) => void;
  onNewCustomer: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(value: string) {
    setQuery(value);
    if (!value.trim()) { setResults([]); setSearched(false); return; }
    setSearching(true);
    const { customers, error } = await searchCustomers(value);
    setSearching(false);
    setSearched(true);
    if (!error) setResults(customers as Customer[]);
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-brand-pink text-center">Verify Customer</h2>
      <p className="mt-1 text-sm text-zinc-500 text-center">Search for an existing account, or start a new booking.</p>

      <div className="mt-6 relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by customer name"
          className="w-full rounded-full border border-pink-200 bg-white pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>

      <div className="mt-3 min-h-[120px]">
        {searching && <p className="text-center text-sm text-zinc-400 py-6">Searching…</p>}
        {!searching && searched && results.length === 0 && (
          <p className="text-center text-sm text-zinc-400 py-6">No matching customer accounts found.</p>
        )}
        {!searching && results.length > 0 && (
          <div className="space-y-2">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectExisting(c)}
                className="w-full flex items-center justify-between bg-white border border-pink-100 rounded-xl px-4 py-3 text-left hover:border-brand-pink transition-colors"
              >
                <div>
                  <p className="font-semibold text-zinc-800">{c.full_name}</p>
                  <p className="text-xs text-zinc-400">{c.customer_id} · {c.phone_number ?? "No phone on file"}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-pink">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 border-t border-zinc-200" />
        <span className="text-xs text-zinc-400">OR</span>
        <div className="flex-1 border-t border-zinc-200" />
      </div>

      <button
        onClick={onNewCustomer}
        className="mt-4 w-full border-2 border-brand-pink text-brand-pink font-semibold py-3 rounded-full hover:bg-brand-pink hover:text-white transition-colors"
      >
        + Add New Customer
      </button>
    </div>
  );
}
