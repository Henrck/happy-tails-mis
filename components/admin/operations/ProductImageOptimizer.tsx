"use client";
// One-time tool (Super Admin, POS Configuration): re-processes existing product
// photos with the same standardization new uploads get, so every card matches.
import { useState } from "react";
import { ImageUp } from "lucide-react";
import type { Product } from "@/lib/types/products";
import { setProductImage, uploadProductImage } from "@/lib/supabase/products";
import { NORMALIZED_IMAGE_MARKER } from "@/lib/utils/product-image";

export default function ProductImageOptimizer({ products, onDone }: { products: Product[]; onDone: () => void }) {
  const pending = products.filter(p => p.image_url && !p.image_url.includes(NORMALIZED_IMAGE_MARKER));
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    if (running || pending.length === 0) return;
    setRunning(true);
    const failed: string[] = [];
    setProgress({ done: 0, total: pending.length, failed });
    for (const [index, product] of pending.entries()) {
      try {
        const response = await fetch(product.image_url!, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const upload = await uploadProductImage(await response.blob(), product.product_code);
        if (upload.error || !upload.url) throw new Error(upload.error ?? "Upload failed");
        if (!upload.url.includes(NORMALIZED_IMAGE_MARKER)) throw new Error("Could not process this image");
        const linked = await setProductImage(product.id, upload.url);
        if (linked.error) throw new Error(linked.error.message);
      } catch (error) {
        failed.push(`${product.name} (${error instanceof Error ? error.message : "failed"})`);
      }
      setProgress({ done: index + 1, total: pending.length, failed: [...failed] });
    }
    setRunning(false);
    onDone();
  }

  if (!progress && pending.length === 0) return null;
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pink-100 bg-white p-4 text-sm shadow-sm">
    <div className="min-w-0">
      <p className="font-semibold text-zinc-800">Standardize product photos</p>
      <p className="text-xs text-zinc-500">
        {progress
          ? `${progress.done} of ${progress.total} processed${progress.failed.length ? ` · ${progress.failed.length} failed` : ""}${!running ? " · done" : ""}`
          : `${pending.length} photo${pending.length === 1 ? "" : "s"} can be trimmed, centred and resized to match. New uploads are standardized automatically.`}
      </p>
      {progress && progress.failed.length > 0 && !running && <p className="mt-1 text-xs text-rose-700">Failed: {progress.failed.join("; ")}</p>}
    </div>
    <button type="button" disabled={running || pending.length === 0} onClick={() => void run()}
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-pink px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
      <ImageUp size={15}/>{running ? "Processing…" : pending.length ? `Standardize ${pending.length} photo${pending.length === 1 ? "" : "s"}` : "All photos standardized"}
    </button>
  </div>;
}
