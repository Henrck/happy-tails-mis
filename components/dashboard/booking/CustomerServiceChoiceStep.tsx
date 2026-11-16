"use client";
import { useState } from "react";
import { Dog, Cat, Scissors, House, Sparkles, Check, ArrowLeft, ArrowRight } from "lucide-react";
import type { Species } from "@/lib/types/appointments";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";

/** A selected pet that already has an unfinished boarding booking. */
export type BoardingBlockedPet = { id: string; name: string; until: string | null };

const listNames = (names: string[]) => names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

export default function CustomerServiceChoiceStep({ choice, onChange, onBack, onNext: _onNext, petSpecies = [], onDraftChoiceChange, boardingBlocked = [], boardingChecking = false }: {
  choice: WalkInServiceChoice | null;
  onChange: (choice: WalkInServiceChoice) => void;
  onBack: () => void;
  onNext: () => void;
  petSpecies?: Species[];
  onDraftChoiceChange?: (choice: WalkInServiceChoice) => void;
  /** Selected pets that cannot be booked for boarding again yet. */
  boardingBlocked?: BoardingBlockedPet[];
  /** True while existing boarding bookings are still being checked. */
  boardingChecking?: boolean;
}) {
  const [selected, setSelected] = useState<WalkInServiceChoice | null>(choice);
  const mixed = petSpecies.includes("Dog") && petSpecies.includes("Cat");
  const allBoardingBlocked = petSpecies.length > 0 && boardingBlocked.length >= petSpecies.length;
  const boardingDisabled = boardingChecking || allBoardingBlocked;
  const boardingNote = boardingChecking ? "Checking existing boarding bookings…"
    : allBoardingBlocked
      ? boardingBlocked.length === 1
        ? `${boardingBlocked[0].name} is already booked for boarding${boardingBlocked[0].until ? ` until ${boardingBlocked[0].until}` : ""}.`
        : `${listNames(boardingBlocked.map(p => p.name))} are already booked for boarding.`
      : boardingBlocked.length
        ? `${listNames(boardingBlocked.map(p => p.name))} ${boardingBlocked.length === 1 ? "is" : "are"} already booked for boarding and won't be included.`
        : null;
  const first = mixed ? { id: "grooming" as const, name: "Grooming", description: "Care for dogs and cats", Icon: Scissors }
    : petSpecies.includes("Cat") ? { id: "cat_grooming" as const, name: "Cat Grooming", description: "Gentle grooming for cats", Icon: Cat }
    : { id: "dog_grooming" as const, name: "Dog Grooming", description: "Bath, haircut and care", Icon: Dog };
  const options = [{ ...first, disabled: false, note: null as string | null },
    { id: "boarding" as const, name: "Boarding", description: "A safe and comfortable stay", Icon: House, disabled: boardingDisabled, note: boardingNote },
    { id: "ala_carte" as const, name: "À La Carte", description: "Individual care services", Icon: Sparkles, disabled: false, note: null },
  ];
  // A previously chosen Boarding card stops counting once it becomes unavailable.
  const effective = selected === "boarding" && boardingDisabled ? null : selected;
  return <section className="mx-auto w-full max-w-4xl">
    <header className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-pink-50 text-brand-pink"><Sparkles size={24}/></span>
      <h2 className="mt-3 text-2xl font-bold text-slate-800">Select Service</h2><p className="mt-1 text-sm text-slate-500">What would you like to book for your {mixed ? "pets" : "pet"}?</p>
    </header>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{options.map(option => {
      const active = effective === option.id;
      const blocked = option.disabled && !boardingChecking;
      return <button type="button" key={option.id} aria-pressed={active} disabled={option.disabled} aria-describedby={option.note ? `${option.id}-note` : undefined}
        onClick={() => { setSelected(option.id); onDraftChoiceChange?.(option.id); }}
        className={`relative flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 p-5 text-center transition-colors disabled:cursor-not-allowed ${active ? "border-brand-pink bg-pink-50/40" : blocked ? "border-zinc-200 bg-zinc-50" : "border-pink-100 bg-white hover:border-pink-300"}`}>
        {active && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-pink text-white"><Check size={15}/></span>}
        {blocked && <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">Already booked</span>}
        <span className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${blocked ? "bg-zinc-100 text-zinc-400" : "bg-pink-50 text-brand-pink"}`}><option.Icon size={34} strokeWidth={1.6}/></span>
        <span className={`text-base font-bold ${blocked ? "text-zinc-500" : "text-slate-800"}`}>{option.name}</span><span className="mt-2 text-xs leading-5 text-slate-500">{option.description}</span>
        {option.note && <span id={`${option.id}-note`} className={`mt-3 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold leading-4 ${blocked ? "bg-amber-50 text-amber-800" : boardingChecking ? "text-slate-400" : "bg-amber-50 text-amber-800"}`}>{option.note}</span>}
      </button>;
    })}</div>
    <div className="mt-8 grid grid-cols-2 gap-3"><button type="button" onClick={onBack} className="flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-pink-200 text-sm font-semibold text-brand-pink"><ArrowLeft size={16}/> Back</button>
      <button type="button" disabled={!effective} onClick={() => {if(effective) onChange(effective)}} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-pink text-sm font-semibold text-white disabled:opacity-40">Next <ArrowRight size={16}/></button></div>
  </section>;
}
