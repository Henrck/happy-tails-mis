"use client";
// Replaces the old "POLICIES" button + modal for Grooming and Boarding
// with an always-visible inline card, matching the reference designs
// exactly (Josh's call — see conversation). The full, more detailed
// 7-point policy list still exists in PoliciesModal; this card links to
// it via "View full policies" so nothing that was already written gets
// thrown away, it's just no longer the primary/only way to see policies.
import { usePoliciesModal } from "./PoliciesModalContext";

export type PolicyItem = { icon: React.ReactNode; text: string };

export default function PoliciesInlineCard({ items }: { items: PolicyItem[] }) {
  const { open } = usePoliciesModal();

  return (
    <div className="rounded-3xl bg-white shadow-lg border-2 border-pink-100 px-6 py-6 md:px-10">
      <div className="flex items-center justify-center gap-2 text-brand-pink font-bold text-sm tracking-wide">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        POLICIES
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
            <div className="shrink-0 w-10 h-10 rounded-full bg-brand-tint flex items-center justify-center text-brand-pink">
              {item.icon}
            </div>
            <p className="text-sm text-zinc-600 leading-snug">{item.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 text-center">
        <button
          onClick={open}
          className="text-xs font-semibold text-brand-pink hover:underline"
        >
          View full policies
        </button>
      </div>
    </div>
  );
}
