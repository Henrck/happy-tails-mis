"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { GalleryPhoto, GalleryService } from "@/lib/types/gallery";

const SERVICE_LABELS: Record<GalleryService, string> = {
  grooming: "Grooming",
  boarding: "Boarding",
  dental: "Dental Care",
  ear_cleaning: "Ear Cleaning",
  nail_trimming: "Nail Trimming",
  other: "Other",
};

type Props = {
  onClose: () => void;
};

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
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setPhotos((data as GalleryPhoto[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function upload(file: File, prefix: string) {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `gallery/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("site-images").upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    return supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  }

  async function addPhoto() {
    if (!beforeFile || !afterFile) {
      setError("Please choose both a BEFORE image and an AFTER image.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const beforeUrl = await upload(beforeFile, "before");
      const afterUrl = await upload(afterFile, "after");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("gallery_photos")
        .insert({
          title: title.trim() || null,
          service,
          before_url: beforeUrl,
          after_url: afterUrl,
          sort_order: photos.length,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos((prev) => [data as GalleryPhoto, ...prev]);
      setTitle("");
      setBeforeFile(null);
      setAfterFile(null);
      if (beforeRef.current) beforeRef.current.value = "";
      if (afterRef.current) afterRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save the photos.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(photo: GalleryPhoto) {
    if (!window.confirm("Remove this before-and-after entry from the website?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
    if (error) {
      setError(error.message);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-brand-pink">Before & After Images</h2>
            <p className="mt-1 text-sm text-zinc-500">Manage the before-and-after photos customers see on the landing page.</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-600">Close</button>
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 rounded-2xl bg-brand-tint p-5">
          <h3 className="font-bold text-zinc-800">Add before & after</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title / pet name" className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink" />
            <select value={service} onChange={(e) => setService(e.target.value as GalleryService)} className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink">
              {Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button disabled={saving} onClick={addPhoto} className="rounded-xl bg-brand-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {saving ? "Uploading..." : "Upload Pair"}
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-white p-4 text-center">
              <span className="block text-sm font-semibold text-zinc-700">BEFORE image</span>
              <span className="mt-1 block truncate text-xs text-zinc-400">{beforeFile?.name ?? "Choose image"}</span>
              <input ref={beforeRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)} />
            </label>
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-white p-4 text-center">
              <span className="block text-sm font-semibold text-zinc-700">AFTER image</span>
              <span className="mt-1 block truncate text-xs text-zinc-400">{afterFile?.name ?? "Choose image"}</span>
              <input ref={afterRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading gallery...</p>
          ) : photos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pink-200 p-8 text-center text-sm text-zinc-500">
              No before-and-after images have been added yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
                  <div className="grid grid-cols-2 gap-1 p-1">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50"><Image src={photo.before_url} alt="Before" fill className="object-cover" unoptimized /></div>
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50"><Image src={photo.after_url} alt="After" fill className="object-cover" unoptimized /></div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-zinc-700">{photo.title || "Untitled"}</p>
                      <p className="text-[10px] text-brand-pink">{SERVICE_LABELS[photo.service]}</p>
                    </div>
                    <button onClick={() => removePhoto(photo)} className="text-xs font-semibold text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
