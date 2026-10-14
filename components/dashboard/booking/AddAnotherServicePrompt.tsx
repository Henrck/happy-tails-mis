"use client";
import { ArrowLeft, ArrowRight, Check, Dog, Cat, Scissors, House, Sparkles, Plus } from "lucide-react";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
const choices = {
  dog_grooming: { label: "Dog Grooming", description: "Bath, trim and finishing care", Icon: Dog },
  cat_grooming: { label: "Cat Grooming", description: "Gentle grooming for cats", Icon: Cat },
  grooming: { label: "Grooming", description: "Care for dogs and cats", Icon: Scissors },
  boarding: { label: "Boarding", description: "A comfortable overnight stay", Icon: House },
  ala_carte: { label: "À La Carte", description: "Additional individual services", Icon: Sparkles },
};
export default function AddAnotherServicePrompt({ eligibleServices, onAddService, onDone, onBack }: {
  eligibleServices: WalkInServiceChoice[];
  onAddService: (choice: WalkInServiceChoice) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  return <section className="ht-more-services mx-auto w-full max-w-3xl">
    <header className="mb-7 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-brand-pink"><Check size={24}/></div>
      <h2 className="mt-4 text-2xl font-bold text-slate-800">Add another service?</h2>
      <p className="mt-2 text-sm text-slate-500">Your current service is ready. Choose an additional service or review your booking.</p>
    </header>
    {eligibleServices.length > 0 ? <div className="grid gap-3 sm:grid-cols-2">
      {eligibleServices.map(choice => { const {label, description, Icon} = choices[choice]; return <button key={choice} type="button" onClick={() => onAddService(choice)} className="group flex items-center gap-4 rounded-2xl border border-pink-100 bg-white p-4 text-left transition hover:border-brand-pink hover:bg-pink-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><Icon size={23} strokeWidth={1.8}/></span>
        <span className="flex-1"><span className="block text-sm font-bold text-slate-800">{label}</span><span className="mt-1 block text-xs text-slate-500">{description}</span></span><Plus size={18} className="text-brand-pink" />
      </button>; })}
    </div> : <p className="rounded-2xl border border-pink-100 bg-pink-50/40 p-6 text-center text-sm text-slate-600">No additional eligible services. Continue to review your booking.</p>}
    <div className="mt-7 grid grid-cols-2 gap-3">
      <button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-pink-200 bg-white text-sm font-semibold text-brand-pink transition hover:border-brand-pink"><ArrowLeft size={16}/> Back</button>
      <button type="button" onClick={onDone} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink text-sm font-semibold text-white transition hover:opacity-90">Review Booking <ArrowRight size={16}/></button>
    </div>
  </section>;
}
