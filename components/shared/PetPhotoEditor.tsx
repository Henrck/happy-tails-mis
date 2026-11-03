"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Camera, Minus, Plus, RotateCcw, X } from "lucide-react";

/** Produces a square 512px JPEG. The circular mask is visual; the saved square
 * can also be displayed in lists, booking cards and printed pet records. */
export default function PetPhotoEditor({ petId, petName, onSaved, onClose }: {
  petId: string;
  petName: string;
  onSaved: (url: string) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const FRAME = 280;
  const fit = Math.max(FRAME / dimensions.width, FRAME / dimensions.height);
  const scale = fit * zoom;
  const renderedWidth = dimensions.width * scale;
  const renderedHeight = dimensions.height * scale;
  const boundX = Math.max(0, (renderedWidth - FRAME) / 2);
  const boundY = Math.max(0, (renderedHeight - FRAME) / 2);
  const clamp = (x: number, y: number) => ({ x: Math.max(-boundX, Math.min(boundX, x)), y: Math.max(-boundY, Math.min(boundY, y)) });

  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [busy, onClose]);

  function choose(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP photo."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a photo under 10 MB."); return; }
    const url = URL.createObjectURL(file);
    const picture = new Image();
    picture.onload = () => {
      if (picture.naturalWidth < 64 || picture.naturalHeight < 64) { URL.revokeObjectURL(url); setError("Please choose an image at least 64 × 64 pixels."); return; }
      imageRef.current = picture;
      setDimensions({ width: picture.naturalWidth, height: picture.naturalHeight });
      setObjectUrl(url); setPosition({ x: 0, y: 0 }); setZoom(1); setError(null);
    };
    picture.onerror = () => { URL.revokeObjectURL(url); setError("This image cannot be read."); };
    picture.src = url;
    if (inputRef.current) inputRef.current.value = "";
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!objectUrl || busy) return;
    dragRef.current = { x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function drag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setPosition(clamp(d.startX + event.clientX - d.x, d.startY + event.clientY - d.y));
  }
  function changeZoom(next: number) {
    const value = Math.max(1, Math.min(3, next));
    const maxX = Math.max(0, (dimensions.width * fit * value - FRAME) / 2);
    const maxY = Math.max(0, (dimensions.height * fit * value - FRAME) / 2);
    setZoom(value);
    setPosition(p => ({ x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) }));
  }
  async function save() {
    const img = imageRef.current;
    if (!img || busy) return;
    setBusy(true); setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to prepare the photo on this device.");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 512, 512);
      const factor = 512 / FRAME;
      ctx.drawImage(img, (FRAME / 2 + position.x - renderedWidth / 2) * factor,
        (FRAME / 2 + position.y - renderedHeight / 2) * factor,
        renderedWidth * factor, renderedHeight * factor);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
      if (!blob) throw new Error("Unable to export the cropped photo.");
      const payload = new FormData();
      payload.append("photo", blob, "pet.jpg");
      const response = await fetch(`/api/pets/photo?petId=${encodeURIComponent(petId)}`, { method: "POST", body: payload });
      const result = await response.json().catch(() => ({})) as { error?: string; url?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Could not save the pet photo.");
      onSaved(result.url);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update the pet photo."); }
    finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/65 p-3 sm:p-5" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={`Edit ${petName}'s profile picture`} className="max-h-[95dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">Pet profile picture</h2><p className="mt-1 text-xs text-slate-500">{petName} · Move and zoom the photo to fit the circle.</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close photo editor" className="rounded-full p-2 hover:bg-pink-50"><X size={20}/></button></div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => choose(e.target.files?.[0])}/>
      {objectUrl ? <>
        <div className="mx-auto mt-5 flex h-[280px] w-[280px] max-w-full items-center justify-center">
          <div onPointerDown={startDrag} onPointerMove={drag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}
            className="relative h-[280px] w-[280px] cursor-grab overflow-hidden rounded-full border-4 border-pink-200 bg-pink-50 shadow-inner active:cursor-grabbing" style={{ touchAction: "none" }} aria-label="Drag to reposition pet photo">
            <img src={objectUrl} alt="Crop preview" draggable={false} className="pointer-events-none absolute max-w-none select-none"
              style={{ width: renderedWidth, height: renderedHeight, left: FRAME / 2 + position.x - renderedWidth / 2 - 4, top: FRAME / 2 + position.y - renderedHeight / 2 - 4 }}/>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3"><button type="button" disabled={busy} onClick={() => changeZoom(zoom - .1)} aria-label="Zoom out" className="rounded-full border p-2"><Minus size={17}/></button><input className="w-full accent-pink-500" aria-label="Photo zoom" type="range" min="1" max="3" step="0.01" value={zoom} disabled={busy} onChange={e => changeZoom(Number(e.target.value))}/><button type="button" disabled={busy} onClick={() => changeZoom(zoom + .1)} aria-label="Zoom in" className="rounded-full border p-2"><Plus size={17}/></button></div>
        <div className="mt-2 flex justify-between gap-2"><button type="button" disabled={busy} onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600"><RotateCcw size={14}/> Reset position</button><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-brand-pink">Choose different photo</button></div>
      </> : <button type="button" onClick={() => inputRef.current?.click()} className="mt-5 flex min-h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50 text-brand-pink"><Camera size={34}/><span className="font-semibold">Choose pet photo</span><span className="text-xs text-slate-500">JPG, PNG or WebP · Up to 10 MB</span></button>}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-zinc-300 py-3 text-sm font-semibold">Cancel</button><button type="button" disabled={!objectUrl || busy} onClick={() => void save()} className="rounded-full bg-brand-pink py-3 text-sm font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save Photo"}</button></div>
    </section>
  </div>;
}
