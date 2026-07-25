"use client";
import { useState } from "react";
import type { KennelSize } from "@/lib/data/boarding-kennels-mock";

export default function AddKennelModal({
  nextNumber,
  onClose,
  onAdd,
}: {
  nextNumber: (size: KennelSize) => number;
  onClose: () => void;
  onAdd: (size: KennelSize, number: number) => void;
}) {
  const [size, setSize] = useState<KennelSize>("small");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="w-full max-w-xs bg-white rounded-3xl overflow-hidden p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-brand-pink">Add Kennel</h3>
        <div className="mt-4 flex gap-2">
          {(["small", "big"] as KennelSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`flex-1 py-2 rounded-full text-sm font-semibold border-2 capitalize transition-colors ${
                size === s ? "bg-brand-pink border-brand-pink text-white" : "border-brand-pink text-brand-pink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Will be added as Kennel {nextNumber(size)}.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 border-2 border-zinc-300 text-zinc-500 font-semibold text-sm py-2 rounded-full hover:border-zinc-400 transition-colors">
            Cancel
          </button>
          <button onClick={() => onAdd(size, nextNumber(size))} className="flex-1 bg-brand-pink hover:bg-brand-pink-dark text-white font-semibold text-sm py-2 rounded-full transition-colors">
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
