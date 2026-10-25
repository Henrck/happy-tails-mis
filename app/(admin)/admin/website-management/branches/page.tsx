"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { WebsiteBranch } from "@/lib/types/website-branches";

type Draft = Omit<WebsiteBranch, "id">;
const empty: Draft = { name: "", location: "", facebook_url: "", image_url: null, description: "", sort_order: 100, published: false };
const isFacebookUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)(facebook\.com|fb\.com)$/i.test(url.hostname) && url.pathname !== "/";
  } catch { return false; }
};

export default function BranchesManagementPage() {
  const [branches, setBranches] = useState<WebsiteBranch[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [deleting, setDeleting] = useState<WebsiteBranch | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const db = useMemo(() => createClient(), []);
  const refresh = useCallback(async () => {
    const { data, error: e } = await db.from("website_branches").select("*").order("sort_order").order("created_at");
    if (e) { setError(e.message); return; }
    setBranches((data ?? []) as WebsiteBranch[]);
  }, [db]);
  useEffect(() => { void refresh().finally(() => setLoading(false)); }, [refresh]);
  const openNew = () => { setDraft({ ...empty, sort_order: (Math.max(0, ...branches.map(b => b.sort_order)) + 10) }); setEditing("new"); setError(""); };
  const openEdit = (branch: WebsiteBranch) => { const { id: _id, ...rest } = branch; void _id; setDraft(rest); setEditing(branch.id); setError(""); };
  async function upload(file: File) {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024) { setError("Upload JPG, PNG or WebP, up to 8 MB."); return; }
    setBusy(true); setError("");
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `website-branches/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await db.storage.from("site-images").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setDraft(prev => ({ ...prev, image_url: db.storage.from("site-images").getPublicUrl(path).data.publicUrl }));
    } catch (e) { setError(e instanceof Error ? e.message : "Image upload failed."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy) return;
    if (draft.name.trim().length < 2 || draft.location.trim().length < 2) { setError("Enter a branch name and location (at least 2 characters each)."); return; }
    if (!isFacebookUrl(draft.facebook_url.trim())) { setError("Enter an HTTPS URL for a specific Facebook page."); return; }
    setBusy(true); setError(""); setNotice("");
    const record = { ...draft, name: draft.name.trim(), location: draft.location.trim(), facebook_url: draft.facebook_url.trim(), description: draft.description.trim(), sort_order: Number.isFinite(draft.sort_order) ? draft.sort_order : 100, updated_at: new Date().toISOString() };
    const result = editing === "new" ? await db.from("website_branches").insert(record).select("id").single() : await db.from("website_branches").update(record).eq("id", editing).select("id").single();
    if (result.error) setError(result.error.message);
    else { setEditing(null); setNotice("Branch saved."); await refresh(); }
    setBusy(false);
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    const { error: e } = await db.from("website_branches").delete().eq("id", deleting.id).select("id").single();
    if (e) setError(e.message);
    else { setNotice("Branch deleted."); setDeleting(null); await refresh(); }
    setBusy(false);
  }
  async function toggle(branch: WebsiteBranch) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    const { error: e } = await db.from("website_branches").update({ published: !branch.published, updated_at: new Date().toISOString() }).eq("id", branch.id).select("id").single();
    if (e) setError(e.message); else { setNotice(branch.published ? "Branch hidden." : "Branch published."); await refresh(); }
    setBusy(false);
  }
  return <div className="mx-auto max-w-6xl pb-16">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold text-brand-pink">Other HappyTails Branches</h1><p className="mt-1 text-sm text-zinc-500">Showcase branch locations and link each card to its Facebook page.</p></div><button type="button" onClick={openNew} className="rounded-full bg-brand-pink px-5 py-2.5 text-sm font-semibold text-white">+ Add Branch</button></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p className="mt-6 text-sm text-zinc-500">Loading branches…</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{branches.map(branch => <article key={branch.id} className="overflow-hidden rounded-2xl border border-pink-100 bg-white shadow-sm">
      <div className="relative aspect-[16/10] bg-brand-tint">{branch.image_url ? <Image src={branch.image_url} alt={branch.name} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-5xl">🐾</div>}</div>
      <div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h2 className="font-bold text-brand-pink">{branch.name}</h2><span className="text-xs text-zinc-500">#{branch.sort_order}</span></div><p className="text-sm text-zinc-600">📍 {branch.location}</p><a href={branch.facebook_url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-blue-600 underline">Open Facebook page</a><p className="text-xs text-zinc-500">{branch.published ? "Published" : "Hidden"}</p><div className="flex flex-wrap gap-2 pt-2"><button onClick={() => openEdit(branch)} className="rounded-full border border-brand-pink px-3 py-1.5 text-xs font-semibold text-brand-pink">Edit</button><button disabled={busy} onClick={() => void toggle(branch)} className="rounded-full border border-pink-200 px-3 py-1.5 text-xs font-semibold text-zinc-700">{branch.published ? "Hide" : "Publish"}</button><button onClick={() => setDeleting(branch)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Delete</button></div></div>
    </article>)}{branches.length === 0 && <p className="col-span-full rounded-2xl border border-dashed border-pink-200 p-8 text-center text-sm text-zinc-500">No branches added yet. Use “Add Branch” to get started.</p>}</div>}
    {editing && <div role="dialog" aria-modal="true" aria-label={editing === "new" ? "Add branch" : "Edit branch"} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"><div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold text-brand-pink">{editing === "new" ? "Add" : "Edit"} Branch</h2>
      <div className="mt-4 grid gap-4"><label className="text-sm font-semibold">Branch name<input maxLength={100} value={draft.name} onChange={e=>setDraft(v=>({...v,name:e.target.value}))} className="mt-1 w-full rounded-xl border p-3" placeholder="HappyTails — Branch Name" /></label><label className="text-sm font-semibold">Location<input maxLength={240} value={draft.location} onChange={e=>setDraft(v=>({...v,location:e.target.value}))} className="mt-1 w-full rounded-xl border p-3" placeholder="City, Province or full address" /></label><label className="text-sm font-semibold">Facebook page URL<input type="url" value={draft.facebook_url} onChange={e=>setDraft(v=>({...v,facebook_url:e.target.value}))} className="mt-1 w-full rounded-xl border p-3" placeholder="https://www.facebook.com/YourBranch" /></label><label className="text-sm font-semibold">Optional description<textarea rows={3} value={draft.description} onChange={e=>setDraft(v=>({...v,description:e.target.value}))} className="mt-1 w-full rounded-xl border p-3" /></label><div className="flex flex-wrap gap-4"><label className="text-sm font-semibold">Display order<input type="number" value={draft.sort_order} onChange={e=>setDraft(v=>({...v,sort_order:Number(e.target.value)}))} className="mt-1 block w-28 rounded-xl border p-2" /></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.published} onChange={e=>setDraft(v=>({...v,published:e.target.checked}))} />Publish on website</label></div><label className="text-sm font-semibold">Branch image (JPG, PNG or WebP, max 8 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value="";}} className="mt-1 block w-full text-sm" /></label>{draft.image_url && <div className="flex items-center gap-3"><div className="relative h-24 w-36 overflow-hidden rounded-xl bg-brand-tint"><Image src={draft.image_url} alt="Branch preview" fill unoptimized className="object-cover" /></div><button type="button" className="text-sm text-red-600 underline" onClick={()=>setDraft(v=>({...v,image_url:null}))}>Remove image</button></div>}</div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={()=>setEditing(null)} className="rounded-full border px-5 py-2 text-sm">Cancel</button><button disabled={busy} onClick={()=>void save()} className="rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save Branch"}</button></div></div></div>}
    {deleting && <div role="alertdialog" aria-modal="true" aria-label="Confirm delete branch" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold">Delete branch?</h2><p className="mt-3 text-sm text-zinc-600">Delete “{deleting.name}”? This will remove the branch card from the website. It does not delete its Facebook page.</p><div className="mt-6 flex justify-end gap-3"><button disabled={busy} onClick={()=>setDeleting(null)} className="rounded-full border px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={()=>void remove()} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white">{busy ? "Deleting…" : "Delete"}</button></div></div></div>}
  </div>;
}
