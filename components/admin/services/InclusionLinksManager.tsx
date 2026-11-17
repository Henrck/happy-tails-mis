"use client";
// Super Admin: link each grooming package inclusion (by name) to the add-on and
// À La Carte items that are the same service. Linked items cannot be booked for
// a pet whose grooming package already includes them.
import { useEffect, useMemo, useState } from "react";
import { Link2, Save } from "lucide-react";
import type { Addon, PackageInclusion } from "@/lib/types/services";
import { fetchAddonsByCategory } from "@/lib/supabase/services";
import { fetchInclusionLinks, setInclusionLinks, type InclusionLink } from "@/lib/supabase/inclusion-links";
import { inclusionKey } from "@/lib/booking/package-inclusions";

const CATEGORIES = ["Grooming Add-ons", "Ala Carte", "Boarding Add-ons"] as const;

export default function InclusionLinksManager({ inclusions }: { inclusions: PackageInclusion[] }) {
  const [links, setLinks] = useState<InclusionLink[]>([]);
  const [catalog, setCatalog] = useState<{ category: string; addons: Addon[] }[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchInclusionLinks(), ...CATEGORIES.map((name) => fetchAddonsByCategory(name))]).then(([l, ...cats]) => {
      if (!active) return;
      setLinks(l.links);
      setCatalog(cats.map((c, i) => ({ category: CATEGORIES[i], addons: c.addons.filter((a) => a.is_active) })));
      if (l.error) setMessage({ tone: "error", text: l.error });
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Distinct inclusion names across this tab's packages, with the packages using them.
  const labels = useMemo(() => {
    const byKey = new Map<string, { label: string; count: number }>();
    for (const inc of inclusions) {
      const key = inclusionKey(inc.label);
      if (!key) continue;
      const row = byKey.get(key) ?? { label: inc.label.trim(), count: 0 };
      row.count += 1;
      byKey.set(key, row);
    }
    return Array.from(byKey.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => a.label.localeCompare(b.label));
  }, [inclusions]);

  const saved = (key: string) => links.filter((l) => l.inclusion_key === key).map((l) => l.addon_id).sort();
  const current = (key: string) => drafts[key] ?? saved(key);
  const dirty = (key: string) => JSON.stringify([...current(key)].sort()) !== JSON.stringify(saved(key));

  function toggle(key: string, addonId: string) {
    const next = current(key).includes(addonId) ? current(key).filter((id) => id !== addonId) : [...current(key), addonId];
    setDrafts((d) => ({ ...d, [key]: next }));
    setMessage(null);
  }

  async function save(key: string, label: string) {
    setSavingKey(key); setMessage(null);
    const ids = current(key);
    const { error } = await setInclusionLinks(label, ids);
    if (error) setMessage({ tone: "error", text: error });
    else {
      setLinks((all) => [...all.filter((l) => l.inclusion_key !== key), ...ids.map((addon_id) => ({ inclusion_key: key, addon_id }))]);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
      setMessage({ tone: "ok", text: `Saved links for “${label}”.` });
    }
    setSavingKey(null);
  }

  return <section className="mt-10 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm">
    <h2 className="flex items-center gap-2 font-bold text-zinc-800"><Link2 size={18} className="text-brand-pink"/>Package inclusions vs. add-ons</h2>
    <p className="mt-1 text-sm text-zinc-500">Link each inclusion to the add-on or À La Carte items that are the same service. A pet whose grooming package includes it can&apos;t also book the linked items in the same booking.</p>
    {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 rounded-lg p-2.5 text-sm ${message.tone === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{message.text}</p>}
    {loading ? <p className="mt-4 text-sm text-zinc-500">Loading links…</p> : labels.length === 0 ? <p className="mt-4 text-sm text-zinc-500">No package inclusions on this tab yet.</p> :
      <div className="mt-4 divide-y divide-pink-50">
        {labels.map(({ key, label, count }) => <div key={key} className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-zinc-800">{label} <span className="text-xs font-normal text-zinc-400">· in {count} package{count === 1 ? "" : "s"} · {current(key).length} linked</span></p>
            <button type="button" disabled={!dirty(key) || savingKey === key} onClick={() => void save(key, label)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink px-4 py-1.5 text-xs font-bold text-white disabled:opacity-40">
              <Save size={13}/>{savingKey === key ? "Saving…" : "Save"}
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {catalog.filter((c) => c.addons.length).map(({ category, addons }) => <div key={category} className="flex flex-wrap items-center gap-1.5">
              <span className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{category === "Ala Carte" ? "À La Carte" : category.replace(" Add-ons", "")}</span>
              {addons.map((addon) => {
                const on = current(key).includes(addon.id);
                return <button key={addon.id} type="button" aria-pressed={on} onClick={() => toggle(key, addon.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? "border-brand-pink bg-brand-pink text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-pink-300"}`}>
                  {addon.name}
                </button>;
              })}
            </div>)}
          </div>
        </div>)}
      </div>}
  </section>;
}
