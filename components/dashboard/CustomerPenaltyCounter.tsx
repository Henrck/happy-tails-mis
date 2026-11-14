"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, HelpCircle, ShieldCheck, X } from "lucide-react";

type PenaltyRow = {
  penalty_count: number;
  penalty_restricted_until: string | null;
  manual_restricted: boolean;
  manual_restricted_until: string | null;
  manual_restriction_reason: string | null;
};

function isManualActive(row: PenaltyRow) {
  return row.manual_restricted && (!row.manual_restricted_until || new Date(row.manual_restricted_until).getTime() > Date.now());
}
function isPenaltyActive(row: PenaltyRow) {
  return !!row.penalty_restricted_until && new Date(row.penalty_restricted_until).getTime() > Date.now();
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
}

export default function CustomerPenaltyCounter() {
  const [row, setRow] = useState<PenaltyRow>({ penalty_count: 0, penalty_restricted_until: null, manual_restricted: false, manual_restricted_until: null, manual_restriction_reason: null });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoading(false); return; }
      const refresh = async () => {
        const { data } = await supabase.from("customer_booking_penalties")
          .select("penalty_count,penalty_restricted_until,manual_restricted,manual_restricted_until,manual_restriction_reason")
          .eq("customer_id", user.id).maybeSingle();
        if (!active) return;
        setRow({ penalty_count: data?.penalty_count ?? 0, penalty_restricted_until: data?.penalty_restricted_until ?? null, manual_restricted: data?.manual_restricted ?? false, manual_restricted_until: data?.manual_restricted_until ?? null, manual_restriction_reason: data?.manual_restriction_reason ?? null });
        setLoading(false);
      };
      await refresh();
      channel = supabase.channel(`customer-penalties-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "customer_booking_penalties", filter: `customer_id=eq.${user.id}` }, refresh).subscribe();
    }
    void load();
    return () => { active = false; if (channel) void supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;
  const restricted = isManualActive(row) || isPenaltyActive(row);
  const until = isManualActive(row) && !row.manual_restricted_until ? null : [isPenaltyActive(row) ? row.penalty_restricted_until : null, isManualActive(row) ? row.manual_restricted_until : null].filter((value): value is string => Boolean(value)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  return <>
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-b border-pink-100 bg-white px-4 py-2.5 sm:px-6 md:px-8">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-zinc-700">Booking penalty</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.penalty_count >= 3 ? "bg-red-100 text-red-700" : row.penalty_count > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{row.penalty_count}/3</span><button type="button" onClick={() => setOpen(true)} aria-label="Explain booking penalty rules" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-400 text-zinc-500 hover:border-brand-pink hover:text-brand-pink"><HelpCircle size={14}/></button></div>
      {restricted && <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-red-600"><AlertTriangle size={14}/> Booking restricted</span>}
    </div>
    {restricted && <div className="mx-auto max-w-6xl bg-red-50 px-4 py-2 text-xs text-red-700 sm:px-6 md:px-8">New appointment booking is temporarily restricted{until ? ` until ${dateLabel(until)}` : " until an administrator lifts the restriction"}. Existing appointments are not cancelled.</div>}
    {open && <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="customer-penalty-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-xl bg-pink-50 p-2 text-brand-pink"><ShieldCheck size={22}/></span><h2 id="customer-penalty-title" className="text-lg font-bold text-zinc-900">Appointment Cancellation Rules</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"><X size={19}/></button></div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
          <p><strong className="text-zinc-800">Three-day grace period:</strong> You may cancel an appointment at least 72 hours before its scheduled start without receiving a penalty, regardless of how many appointments you cancel that day.</p>
          <p><strong className="text-zinc-800">Daily late-cancellation allowance:</strong> The first three late cancellations in a Philippine calendar day are allowed. Exceeding the limit applies one penalty point and a one-day booking restriction for that day.</p>
          <p><strong className="text-zinc-800">No-show:</strong> Not arriving for an appointment adds two penalty points and a one-day booking restriction.</p>
          <p><strong className="text-zinc-800">Maximum penalty:</strong> At three penalty points, new appointment booking is restricted for one month.</p>
          <p className="rounded-xl bg-pink-50 p-3 text-xs">Penalty points remain on record after a restriction expires; the restriction ending does not reset the counter. An administrator may lift a restriction early, but that does not erase the recorded points. Existing confirmed appointments are not automatically cancelled.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="mt-5 w-full rounded-full bg-brand-pink py-3 font-bold text-white">I Understand</button>
      </div>
    </div>}
  </>;
}
