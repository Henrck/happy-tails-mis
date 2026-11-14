"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { GalleryPhoto, GalleryService } from "@/lib/types/gallery";
import ActionConfirmModal from "@/components/admin/operations/ActionConfirmModal";

const SERVICE_LABELS: Record<GalleryService, string> = {
  grooming: "Grooming",
  boarding: "Boarding",
  dental: "Dental Care",
  ear_cleaning: "Ear Cleaning",
  nail_trimming: "Nail Trimming",
  other: "Other",
};

type UploadedImage = { url: string; path: string };

let watermarkLogoPromise: Promise<HTMLImageElement> | null = null;

function loadWatermarkLogo(): Promise<HTMLImageElement> {
  if (!watermarkLogoPromise) {
    watermarkLogoPromise = new Promise((resolve, reject) => {
      const logo = new window.Image();
      logo.onload = () => resolve(logo);
      logo.onerror = () => {
        watermarkLogoPromise = null;
        reject(new Error("The Happy Tails logo could not be loaded. Check public/images/logo.png."));
      };
      logo.src = "/images/logo.png";
    });
  }
  return watermarkLogoPromise;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

async function createWatermarkedFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const source = new window.Image();
    source.src = objectUrl;
    await new Promise<void>((resolve, reject) => {
      source.onload = () => resolve();
      source.onerror = () => reject(new Error(`The image ${file.name} could not be opened.`));
    });

    const width = source.naturalWidth;
    const height = source.naturalHeight;
    if (!width || !height) throw new Error(`The image ${file.name} has invalid dimensions.`);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the watermark.");

    context.drawImage(source, 0, 0, width, height);

    const logo = await loadWatermarkLogo();
    // Scale the brand mark relative to the photo so it remains legible on
    // portrait, landscape, and square images without covering the pet.
    const scale = Math.min(1, width / 280, height / 110);
    const badgeHeight = Math.max(20, 44 * scale);
    const logoSize = badgeHeight * 0.68;
    const padding = badgeHeight * 0.24;
    const fontSize = Math.max(8, badgeHeight * 0.27);
    context.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
    const brandText = "HAPPY TAILS";
    const textWidth = context.measureText(brandText).width;
    const badgeWidth = padding * 2 + logoSize + padding * 0.65 + textWidth;
    const margin = Math.max(8, Math.min(width, height) * 0.025);
    const x = Math.max(4, width - badgeWidth - margin);
    const y = Math.max(4, height - badgeHeight - margin);

    context.save();
    context.globalAlpha = 0.9;
    context.fillStyle = "rgba(255, 255, 255, 0.88)";
    context.strokeStyle = "rgba(217, 70, 139, 0.82)";
    context.lineWidth = Math.max(1, badgeHeight * 0.025);
    roundedRect(context, x, y, badgeWidth, badgeHeight, badgeHeight * 0.22);
    context.fill();
    context.stroke();

    context.globalAlpha = 0.96;
    const logoY = y + (badgeHeight - logoSize) / 2;
    context.drawImage(logo, x + padding, logoY, logoSize, logoSize);

    context.globalAlpha = 1;
    context.fillStyle = "#d9468b";
    context.textBaseline = "middle";
    context.fillText(brandText, x + padding + logoSize + padding * 0.65, y + badgeHeight / 2);
    context.restore();

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("The watermarked image could not be generated.")),
        "image/jpeg",
        0.93,
      );
    });

    const originalName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${originalName}-happytails-watermarked.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function isWatermarked(url: string): boolean {
  return url.includes("/gallery/watermarked-");
}

export default function BeforeAfterImagesManager({ onClose }: { onClose: () => void }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [service, setService] = useState<GalleryService>("grooming");
  const [title, setTitle] = useState("");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [watermarking, setWatermarking] = useState(false);
  const [watermarkProgress, setWatermarkProgress] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<GalleryPhoto | null>(null);
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

  useEffect(() => { void load(); }, []);

  async function upload(file: File, prefix: string): Promise<UploadedImage> {
    const supabase = createClient();
    const watermarkedFile = await createWatermarkedFile(file);
    const path = `gallery/watermarked-${prefix}-${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from("site-images")
      .upload(path, watermarkedFile, { upsert: false, contentType: "image/jpeg" });
    if (error) throw error;
    return {
      path,
      url: supabase.storage.from("site-images").getPublicUrl(path).data.publicUrl,
    };
  }

  async function uploadFromUrl(url: string, prefix: string): Promise<UploadedImage> {
    const supabase = createClient();
    const storageMarker = "/storage/v1/object/public/site-images/";
    const markerIndex = url.indexOf(storageMarker);
    let blob: Blob;

    if (markerIndex >= 0) {
      const encodedPath = url.slice(markerIndex + storageMarker.length).split("?")[0];
      const storagePath = decodeURIComponent(encodedPath);
      const { data, error } = await supabase.storage.from("site-images").download(storagePath);
      if (error || !data) throw error ?? new Error("Could not download an existing gallery image.");
      blob = data;
    } else {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not read an existing gallery image (HTTP ${response.status}).`);
      blob = await response.blob();
    }

    if (!blob.type.startsWith("image/")) throw new Error("An existing gallery file is not a readable image.");
    const file = new File([blob], `${prefix}-existing.${blob.type.split("/")[1] || "jpg"}`, { type: blob.type });
    return upload(file, prefix);
  }

  async function cleanupUploads(paths: string[]) {
    if (!paths.length) return;
    try { await createClient().storage.from("site-images").remove(paths); } catch { /* Preserve the original gallery records if cleanup is unavailable. */ }
  }

  async function addPhoto() {
    if (!beforeFile || !afterFile) {
      setError("Please choose both a BEFORE image and an AFTER image.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    const uploadedPaths: string[] = [];
    try {
      const beforeUpload = await upload(beforeFile, "before");
      uploadedPaths.push(beforeUpload.path);
      const afterUpload = await upload(afterFile, "after");
      uploadedPaths.push(afterUpload.path);

      const supabase = createClient();
      const { data, error } = await supabase
        .from("gallery_photos")
        .insert({
          title: title.trim() || null,
          service,
          before_url: beforeUpload.url,
          after_url: afterUpload.url,
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
      setStatus("Both photos were uploaded with the Happy Tails watermark permanently embedded.");
    } catch (err) {
      await cleanupUploads(uploadedPaths);
      setError(err instanceof Error ? err.message : "Unable to save the photos.");
    } finally {
      setSaving(false);
    }
  }

  async function watermarkExistingPhotos() {
    const pending = photos.filter((photo) => !isWatermarked(photo.before_url) || !isWatermarked(photo.after_url));
    if (!pending.length || watermarking) return;

    const confirmed = window.confirm(
      `Apply the permanent Happy Tails watermark to ${pending.length} existing photo pair(s)? The gallery will use newly watermarked copies. Original storage files will be kept as backups.`,
    );
    if (!confirmed) return;

    setWatermarking(true);
    setError(null);
    setStatus(null);
    let completed = 0;
    const failures: string[] = [];
    const supabase = createClient();

    for (let index = 0; index < pending.length; index += 1) {
      const photo = pending[index];
      const newPaths: string[] = [];
      setWatermarkProgress(`Watermarking photo pair ${index + 1} of ${pending.length}...`);
      try {
        let beforeUrl = photo.before_url;
        let afterUrl = photo.after_url;

        if (!isWatermarked(photo.before_url)) {
          const uploaded = await uploadFromUrl(photo.before_url, "before");
          beforeUrl = uploaded.url;
          newPaths.push(uploaded.path);
        }
        if (!isWatermarked(photo.after_url)) {
          const uploaded = await uploadFromUrl(photo.after_url, "after");
          afterUrl = uploaded.url;
          newPaths.push(uploaded.path);
        }

        const { error: updateError } = await supabase
          .from("gallery_photos")
          .update({ before_url: beforeUrl, after_url: afterUrl, updated_at: new Date().toISOString() })
          .eq("id", photo.id);
        if (updateError) throw updateError;

        setPhotos((current) => current.map((item) => item.id === photo.id
          ? { ...item, before_url: beforeUrl, after_url: afterUrl }
          : item));
        completed += 1;
      } catch (err) {
        await cleanupUploads(newPaths);
        failures.push(`${photo.title || "Untitled photo pair"}: ${err instanceof Error ? err.message : "Could not apply watermark."}`);
      }
    }

    setWatermarkProgress("");
    setWatermarking(false);
    if (failures.length) {
      setError(`${completed} photo pair(s) watermarked. ${failures.length} could not be updated: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "; and more." : ""}`);
    } else {
      setStatus(`Successfully embedded the watermark into ${completed} existing photo pair(s). Original storage files were kept as backups.`);
    }
  }

  async function removePhotoConfirmed() {
    if (!removeTarget || removing) return;
    setRemoving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("gallery_photos").delete().eq("id", removeTarget.id);
      if (error) { setError(error.message); return; }
      setPhotos((prev) => prev.filter((p) => p.id !== removeTarget.id));
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  }

  const photosNeedingWatermark = photos.filter((photo) => !isWatermarked(photo.before_url) || !isWatermarked(photo.after_url)).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-6xl overflow-y-auto overscroll-contain rounded-3xl bg-white p-4 shadow-2xl sm:p-6">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-brand-pink">Before & After Images</h2>
            <p className="mt-1 text-sm text-zinc-500">Manage the before-and-after photos customers see on the landing page.</p>
          </div>
          <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-600">Close</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {status && <p role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{status}</p>}

        <div className="mt-6 rounded-2xl bg-brand-tint p-4 sm:p-5">
          <h3 className="font-bold text-zinc-800">Add before & after</h3>
          <p className="mt-1 text-xs text-zinc-600">The Happy Tails logo watermark is embedded into each image before upload. It remains visible when the image is saved or shared elsewhere.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional title / pet name" className="min-h-11 min-w-0 rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink" />
            <select value={service} onChange={(e) => setService(e.target.value as GalleryService)} className="min-h-11 min-w-0 rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-pink">{Object.entries(SERVICE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" disabled={saving || watermarking} onClick={() => void addPhoto()} className="min-h-11 rounded-xl bg-brand-pink px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Watermarking & uploading..." : "Upload Pair"}</button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-white p-4 text-center"><span className="block text-sm font-semibold text-zinc-700">BEFORE image</span><span className="mt-1 block truncate text-xs text-zinc-400">{beforeFile?.name ?? "Choose image"}</span><input ref={beforeRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)} /></label>
            <label className="cursor-pointer rounded-2xl border-2 border-dashed border-pink-300 bg-white p-4 text-center"><span className="block text-sm font-semibold text-zinc-700">AFTER image</span><span className="mt-1 block truncate text-xs text-zinc-400">{afterFile?.name ?? "Choose image"}</span><input ref={afterRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)} /></label>
          </div>
        </div>

        {photosNeedingWatermark > 0 && (
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-pink-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-800">Existing photos need a watermark</h3>
              <p className="mt-1 text-xs text-zinc-500">Apply the watermark to {photosNeedingWatermark} existing photo pair(s). Original files stay in storage as backups.</p>
              {watermarkProgress && <p role="status" className="mt-2 text-xs font-semibold text-brand-pink">{watermarkProgress}</p>}
            </div>
            <button type="button" disabled={watermarking || saving || loading} onClick={() => void watermarkExistingPhotos()} className="min-h-11 shrink-0 rounded-xl border border-brand-pink px-4 py-2 text-sm font-bold text-brand-pink disabled:opacity-50">
              {watermarking ? "Applying watermark..." : "Watermark Existing Photos"}
            </button>
          </div>
        )}

        <div className="mt-6">
          {loading ? <p className="text-sm text-zinc-500">Loading gallery...</p> : photos.length === 0 ? <div className="rounded-2xl border border-dashed border-pink-200 p-8 text-center text-sm text-zinc-500">No before-and-after images have been added yet.</div> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => <div key={photo.id} className="overflow-hidden rounded-2xl border border-pink-100 bg-white">
                <div className="grid grid-cols-2 gap-1 p-1">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50"><Image src={photo.before_url} alt="Before" fill className="object-cover" unoptimized /></div>
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-pink-50"><Image src={photo.after_url} alt="After" fill className="object-cover" unoptimized /></div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-zinc-700">{photo.title || "Untitled"}</p><p className="text-[10px] text-brand-pink">{SERVICE_LABELS[photo.service]}</p></div><button type="button" onClick={() => setRemoveTarget(photo)} className="min-h-11 px-2 text-xs font-semibold text-red-500">Delete</button></div>
              </div>)}
            </div>
          )}
        </div>
      </div>
      {removeTarget && <ActionConfirmModal title="Delete before & after photos?" description={`Remove ${removeTarget.title || "this photo pair"} from the website? This action cannot be undone.`} confirmLabel="Delete Photos" destructive pending={removing} onCancel={() => setRemoveTarget(null)} onConfirm={removePhotoConfirmed} />}
    </div>
  );
}
