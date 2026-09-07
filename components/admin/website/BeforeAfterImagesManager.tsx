"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { GalleryPhoto, GalleryService } from "@/lib/types/gallery";

const SERVICE_LABELS: Record<GalleryService, string> = { grooming: "Grooming", boarding: "Boarding", dental: "Dental Care", ear_cleaning: "Ear Cleaning", nail_trimming: "Nail Trimming", other: "Other" };

type Props = { onClose: () => void };

export default function BeforeAfterImagesManager({ onClose }: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [service, setService] = useState<GalleryService>("grooming");
  const [title, setTitle] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);

  async function load() {
    const supabase = createClient();
    const { data, error } = await supabase.from("gallery_photos").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
    if (error) setError(error.message); else setPhotos((data as GalleryPhoto[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function upload(file: File, prefix: string) {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `gallery/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }

  async function addPhoto() {
    if (!beforeFile || !afterFile) { setError("Please select both a before and an after image."); return; }
    setSaving(true); setError(null);
    try {
      const [beforeUrl, afterUrl] = await Promise.all([upload(beforeFile, "before"), upload(afterFile, "after")]);
      const supabase = createClient();
      const { error } = await supabase.from("gallery_photos").insert({ title: title.trim() || null, service, before_url: beforeUrl, after_url: afterUrl, sort_order: photos.length, active: true });
      if (error) throw error;
      setTitle(""); setBeforeFile(null); setAfterFile(null);
      if (beforeRef.current) beforeRef.current.value = "";
      if (afterRef.current) afterRef.current.value = "";
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to add gallery photo."); }
    finally { setSaving(false); }
  }

  async function toggleActive(photo: GalleryPhoto) {
    const supabase = createClient();
    const { error } = await supabase.from("gallery_photos").update({ active: !photo.active, updated_at: new Date().toISOString() }).eq("id", photo.id);
    if (error) setError(error.message); else setPhotos((prev) => prev.map((p) => p.id === photo.id ? { ...p, active: !p.active } : p));
  }

  async function removePhoto(photo: GalleryPhoto) {
    if (!window.confirm("Remove this before-and-after entry?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (error) setError(error.message); else setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center gap-3"><div className="flex-1"><h3 className="text-lg font-bold text-brand-pink">Before & After Gallery</h3><p className="mt-1 text-xs text-zinc-500">Add grooming and service transformations visible to customers.</p></div><button onClick={onClose} className="text-sm font-semibold text-zinc-400 hover:text-zinc-600">Close</button></div>{error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}<div className="mt-5 rounded-2xl border border-brand-pink-light/50 bg-brand-tint p-4"><div className="grid gap-3 md:grid-cols-3"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink"/><select value={service} onChange={(e) => setService(e.target.value as GalleryService)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink">{Object.entries(SERVICE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button disabled={saving} onClick={addPhoto} className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:bg-brand-pink-dark disabled:opacity-60">{saving ? "Saving..." : "Add Before & After"}</button></div><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-600">Before<input ref={beforeRef} type="file" accept="image/*" onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs"/></label><label className="rounded-xl border border-dashed border-zinc-300 bg-white p-3 text-sm text-zinc-600">After<input ref={afterRef} type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs"/></label></div></div>{loading ? <p className="py-8 text-center text-sm text-zinc-500">Loading gallery...</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <div key={photo.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="grid grid-cols-2 gap-1 p-1"><div className="relative aspect-square"><Image src={photo.before_url} alt="Before" fill className="object-cover" unoptimized/></div><div className="relative aspect-square"><Image src={photo.after_url} alt="After" fill className="object-cover" unoptimized/></div></div><div className="p-3"><p className="text-sm font-semibold text-zinc-700">{photo.title || SERVICE_LABELS[photo.service]}</p><p className="mt-1 text-xs text-zinc-500">{photo.active ? "Visible to customers" : "Hidden"}</p><div className="mt-3 flex gap-2"><button onClick={() => toggleActive(photo)} className="rounded-full border border-brand-pink px-3 py-1 text-xs font-semibold text-brand-pink">{photo.active ? "Hide" : "Show"}</button><button onClick={() => removePhoto(photo)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">Remove</button></div></div></div>)}</div>}</div></div>;
}
