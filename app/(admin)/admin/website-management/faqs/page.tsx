"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { defaultFAQs, FAQ_TEXT_KEY, isValidFAQJson, parseFAQs, type FAQItem } from "@/lib/website/faq";
import FAQSection from "@/components/landing/FAQSection";

const db = createClient();
const createId = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID() : `faq-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function FAQManagementPage() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data, error: failure } = await db.from("website_text").select("value").eq("key", FAQ_TEXT_KEY).maybeSingle();
    if (failure) { setError(`Could not load FAQs: ${failure.message}`); return; }
    if (data && !isValidFAQJson(data.value)) {
      setError("The stored FAQ content has an invalid format. No changes were loaded; correct it before saving.");
      return;
    }
    setItems(data ? parseFAQs(data.value) : defaultFAQs.map(item => ({ ...item })));
    setDirty(false);
    setError("");
  }, []);

  useEffect(() => { void load().finally(() => setLoading(false)); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function change(next: FAQItem[]) { setItems(next); setDirty(true); setMessage(""); }
  function edit(id: string, patch: Partial<FAQItem>) { change(items.map(item => item.id === id ? { ...item, ...patch } : item)); }
  function move(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items]; [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }
  async function save() {
    if (busy || loading) return;
    if (items.length > 60) { setError("The FAQ section supports a maximum of 60 questions."); return; }
    if (items.some(item => !item.question.trim() || !item.answer.trim())) {
      setError("Every FAQ needs both a question and an answer. Remove incomplete entries or finish writing them."); return;
    }
    if (new Set(items.map(item => item.id)).size !== items.length) { setError("Duplicate FAQ identifiers found. Please reload and try again."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const sanitized = items.map(item => ({
        id: item.id, question: item.question.trim(), answer: item.answer.trim(), published: item.published,
      }));
      const { data, error: failure } = await db.from("website_text")
        .upsert({ key: FAQ_TEXT_KEY, value: JSON.stringify(sanitized), updated_at: new Date().toISOString() }, { onConflict: "key" })
        .select("value").single();
      if (failure) throw new Error(failure.message);
      if (!data || !isValidFAQJson(data.value)) throw new Error("The database did not confirm the saved FAQ content.");
      setItems(parseFAQs(data.value)); setDirty(false);
      setMessage("FAQs saved. Published questions are visible on the website after refresh.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save FAQs."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-brand-pink sm:text-3xl">Frequently Asked Questions</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600">Manage customer questions shown on the public landing page. Reorder, publish, unpublish, or remove any question.</p></div>
        <Link href="/admin/website-management" className="rounded-full border border-pink-200 px-4 py-2 text-sm font-semibold text-brand-pink">Back to Website Management</Link>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</p>}
      {loading ? <p className="py-10 text-sm text-zinc-500">Loading FAQs…</p> : <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white p-4">
          <span className="text-sm text-zinc-600">{items.length} question{items.length === 1 ? "" : "s"} · {items.filter(item => item.published).length} published {dirty && <strong className="ml-2 text-amber-700">Unsaved changes</strong>}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || items.length >= 60} onClick={() => change([...items, { id: createId(), question: "", answer: "", published: false }])} className="rounded-full border border-brand-pink px-4 py-2 text-sm font-semibold text-brand-pink disabled:opacity-50">+ Add FAQ</button>
            <button type="button" disabled={busy || !dirty || !!error && !items.length} onClick={() => void save()} className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save Changes"}</button>
          </div>
        </div>
        <div className="grid gap-4">{items.map((item, index) => <section key={item.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Question {index + 1}</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700"><input type="checkbox" checked={item.published} disabled={busy} onChange={e => edit(item.id, { published: e.target.checked })} className="accent-pink-500" />Published</label>
              <button type="button" aria-label={`Move question ${index + 1} up`} disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded-lg border px-2.5 py-1 text-sm disabled:opacity-30">↑</button>
              <button type="button" aria-label={`Move question ${index + 1} down`} disabled={busy || index === items.length - 1} onClick={() => move(index, 1)} className="rounded-lg border px-2.5 py-1 text-sm disabled:opacity-30">↓</button>
              <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Remove this FAQ? Save Changes to publish the deletion.`)) change(items.filter(row => row.id !== item.id)); }} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 disabled:opacity-40">Remove</button>
            </div>
          </div>
          <label className="block text-sm font-semibold text-zinc-800">Question<input maxLength={250} disabled={busy} value={item.question} onChange={e => edit(item.id, { question: e.target.value })} placeholder="What would customers like to know?" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-normal focus:border-brand-pink focus:outline-none" /></label>
          <label className="mt-3 block text-sm font-semibold text-zinc-800">Answer<textarea maxLength={3000} disabled={busy} rows={3} value={item.answer} onChange={e => edit(item.id, { answer: e.target.value })} placeholder="Give a clear, helpful answer…" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-normal focus:border-brand-pink focus:outline-none" /></label>
        </section>)}</div>
        <div className="flex justify-end"><button type="button" disabled={busy || !dirty} onClick={() => void save()} className="rounded-full bg-brand-pink px-6 py-3 font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Save All FAQ Changes"}</button></div>
        <div className="overflow-hidden rounded-2xl border border-pink-100"><FAQSection items={items} /></div>
      </>}
    </div>
  );
}
