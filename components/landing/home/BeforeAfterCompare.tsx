"use client";
// Drag (or use the keyboard slider) to compare a groom's before and after photos.
import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronsLeftRight } from "lucide-react";

export default function BeforeAfterCompare({ before, after, title, sizes = "(min-width: 1024px) 60vw, 100vw", priority = false }: {
  before: string; after: string; title: string; sizes?: string; priority?: boolean;
}) {
  const [split, setSplit] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    setSplit(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  return <div ref={box} className="relative h-full w-full touch-none select-none overflow-hidden rounded-[28px] bg-[#F3E7EE]"
    onPointerDown={(e) => { dragging.current = true; (e.target as Element).setPointerCapture?.(e.pointerId); moveTo(e.clientX); }}
    onPointerMove={(e) => { if (dragging.current) moveTo(e.clientX); }}
    onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
    <Image src={after} alt={`${title} after grooming`} fill sizes={sizes} priority={priority} className="object-cover" draggable={false}/>
    <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
      <Image src={before} alt={`${title} before grooming`} fill sizes={sizes} priority={priority} className="object-cover" draggable={false}/>
    </div>
    <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-700 shadow-sm">Before</span>
    <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-brand-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">After</span>
    <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" style={{ left: `${split}%` }}>
      <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-pink shadow-lg">
        <ChevronsLeftRight size={20}/>
      </span>
    </div>
    <input type="range" min={0} max={100} value={Math.round(split)} onChange={(e) => setSplit(Number(e.target.value))}
      aria-label={`Compare ${title} before and after`} className="absolute inset-x-0 bottom-0 h-10 w-full cursor-ew-resize opacity-0"/>
  </div>;
}
