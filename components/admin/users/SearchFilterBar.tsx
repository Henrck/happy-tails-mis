"use client";
import type { AccountStatus } from "@/lib/types/users";

export default function SearchFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  status: AccountStatus | "all";
  onStatusChange: (v: AccountStatus | "all") => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[220px] relative">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, ID, email, or phone"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-full border border-pink-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink"
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as AccountStatus | "all")}
        className="rounded-full border border-pink-200 bg-white px-4 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-pink"
      >
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
