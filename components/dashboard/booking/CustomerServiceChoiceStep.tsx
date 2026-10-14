"use client";
import { useState } from "react";
import { Dog, Cat, Scissors, House, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import type { Species } from "@/lib/types/appointments";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
export default function CustomerServiceChoiceStep({ choice, onChange, onBack, onNext: _onNext, petSpecies = [] }: {
  choice: WalkInServiceChoice | null;
  onChange: (choice: WalkInServiceChoice) => void;
  onBack: () => void;
  onNext: () => void;
  petSpecies?: Species[];
}) {
  const [selected, setSelected] = useState<WalkInServiceChoice | null>(choice);
  const mixed = petSpecies.includes("Dog") && petSpecies.includes("Cat");
  const first = mixed ? { id: "grooming" as const, name: "Grooming", description: "Care for dogs and cats", Icon: Scissors }
    : petSpecies.includes("Cat") ? { id: "cat_grooming" as const, name: "Cat Grooming", description: "Gentle grooming for cats", Icon: Cat }
    : { id: "dog_grooming" as const, name: "Dog Grooming", description: "Bath, haircut and care", Icon: Dog };
  const options = [first,
    { id: "boarding" as const, name: "Boarding", description: "A safe and comfortable stay", Icon: House },
    { id: "ala_carte" as const, name: "À La Carte", description: "Individual care services", Icon: Sparkles },
  ];
  return <section className="mx-auto w-full max-w-4xl">
    <header className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><Sparkles size={24}/></span>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">Select Service</h2><p className="mt-1 text-sm text-slate-500">What would you like to book for your {mixed ? "pets" : "pet"}?</p>
    </header>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{options.map(option => {
      const active = selected === option.id;
      return <button type="button" key={option.id} aria-pressed={active} onClick={() => setSelected(option.id)} className={`relative flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 bg-white p-5 text-center transition-colors ${active ? "border-brand-pink bg-pink-50/40" : "border-pink-100 hover:border-pink-300"}`}>
        {active && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink text-white"><Check size={15}/></span>}
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-brand-pink"><option.Icon size={34} strokeWidth={1.6}/></span>
        <span className="text-base font-bold text-slate-800">{option.name}</span><span className="mt-2 text-xs leading-5 text-slate-500">{option.description}</span>
      </button>;
    })}</div>
    <div className="mt-8 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-pink-200 text-sm font-semibold text-brand-pink"><ArrowLeft size={16}/> Back</button>
      <button type="button" disabled={!selected} onClick={() => {if(selected) onChange(selected)}} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink text-sm font-semibold text-white disabled:opacity-40">Next <ArrowRight size={16}/></button></div>
  </section>;
}
