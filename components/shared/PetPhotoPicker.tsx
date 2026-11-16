"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import PetPhotoEditor from "@/components/shared/PetPhotoEditor";
import type { PetPhotoDraft } from "@/lib/utils/pet-photo-upload";

/** Optional photo field for pet registration forms. The photo is cropped now
 * and uploaded by the form right after the pet record is created. */
export default function PetPhotoPicker({ value, onChange, petName, disabled }: {
  value: PetPhotoDraft | null;
  onChange: (photo: PetPhotoDraft | null) => void;
  petName: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  // Release the preview's object URL when it is replaced, removed or unmounted.
  useEffect(() => () => { if (value) URL.revokeObjectURL(value.previewUrl); }, [value]);

  return <div className="flex items-center gap-4 rounded-2xl border border-pink-100 bg-pink-50/40 p-3">
    <button type="button" disabled={disabled} onClick={() => setEditing(true)} aria-label={value ? "Change pet photo" : "Add pet photo"}
      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-pink-300 bg-white text-brand-pink disabled:opacity-50">
      {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not an optimizable remote image */}
      {value ? <img src={value.previewUrl} alt="" className="h-full w-full object-cover"/> : <Camera size={24}/>}
    </button>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-zinc-800">Pet Photo <span className="font-normal text-zinc-400">(Optional)</span></p>
      <p className="text-xs text-zinc-500">{value ? "This photo will be saved with the pet." : "You can also add or change it later from the pet's profile."}</p>
      <div className="mt-1.5 flex gap-3">
        <button type="button" disabled={disabled} onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-pink disabled:opacity-50">{value ? "Change photo" : "Add photo"}</button>
        {value && <button type="button" disabled={disabled} onClick={() => onChange(null)} className="text-xs font-semibold text-zinc-500 disabled:opacity-50">Remove</button>}
      </div>
    </div>
    {editing && <PetPhotoEditor petName={petName.trim()} onClose={() => setEditing(false)}
      onCropped={blob => onChange({ blob, previewUrl: URL.createObjectURL(blob) })}/>}
  </div>;
}
