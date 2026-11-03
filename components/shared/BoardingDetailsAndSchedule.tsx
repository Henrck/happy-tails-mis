"use client";

import { useCallback, useState } from "react";
import BoardingSelectionStep from "@/components/admin/pos/walk-in/BoardingSelectionStep";
import BoardingGroupSchedule from "@/components/shared/BoardingGroupSchedule";
import BookingStepConfirmation from "@/components/shared/BookingStepConfirmation";
import type { DraftPetSelection, Pet } from "@/lib/types/appointments";
import type { Kennel } from "@/lib/types/pet-services";
import type { PackagePricing } from "@/lib/types/services";

type Props = {
  pets: Pet[];
  selections: DraftPetSelection[];
  kennels: Kennel[];
  scheduledDate: string | null;
  petBelongings: string[];
  specialRequests: string;
  alreadyGroomedPetIds: string[];
  onChange: (items: DraftPetSelection[]) => void;
  onBelongingsChange: (items: string[]) => void;
  onRequestsChange: (text: string) => void;
  onBack: () => void;
  onConfirmed: (items: DraftPetSelection[]) => void;
};

/** Separate Boarding Details and Dates screens, keeping Customer/POS routes intact. */
export default function BoardingDetailsAndSchedule(props: Props) {
  const [stage, setStage] = useState<"details" | "dates">("details");
  const [prompt, setPrompt] = useState<"back" | "dates" | null>(null);
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [detailsValid, setDetailsValid] = useState(false);
  const prepared = useCallback((rows: PackagePricing[], valid: boolean) => {
    setPricing(rows);
    setDetailsValid(valid);
  }, []);
  const signature = props.selections.map((s) =>
    `${s.pet.id}:${s.boardingKennelSize ?? ""}:${s.packagePricingId ?? ""}:${s.boardingNights ?? ""}`
  ).sort().join("|");
  const hasDetails = props.selections.some(s => Boolean(s.packageId || s.packagePricingId || s.boardingKennelSize || s.addonIds.length));

  return <div className="mx-auto max-w-4xl space-y-5">
    <nav aria-label="Boarding booking steps" className="grid grid-cols-2 gap-2 rounded-2xl border border-pink-100 bg-white p-3 sm:p-4">
      <div aria-current={stage === "details" ? "step" : undefined} className={`rounded-xl px-3 py-3 text-center text-sm font-bold ${stage === "details" ? "bg-brand-pink text-white" : "bg-emerald-50 text-emerald-800"}`}>
        1. Boarding Details
      </div>
      <div aria-current={stage === "dates" ? "step" : undefined} className={`rounded-xl px-3 py-3 text-center text-sm font-bold ${stage === "dates" ? "bg-brand-pink text-white" : "bg-zinc-100 text-zinc-500"}`}>
        2. Boarding Dates
      </div>
    </nav>

    {stage === "details" ? <BoardingSelectionStep
      pets={props.pets} selections={props.selections}
      onChange={props.onChange} scheduledDate={props.scheduledDate}
      alreadyGroomedPetIds={props.alreadyGroomedPetIds}
      onPrepared={prepared} onBack={() => { if (hasDetails) setPrompt("back"); else props.onBack(); }}
      onNext={() => { if (detailsValid) setPrompt("dates"); }}
    /> : !detailsValid ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      Please complete valid Boarding Details first.
      <button type="button" className="ml-2 font-bold underline" onClick={() => setStage("details")}>Back to Details</button>
    </div> : <BoardingGroupSchedule
      key={signature}
      petSelections={props.selections} pricing={pricing} kennels={props.kennels}
      petBelongings={props.petBelongings} specialRequests={props.specialRequests}
      onBelongingsChange={props.onBelongingsChange} onRequestsChange={props.onRequestsChange}
      onSelectionsChange={props.onChange}
      onBack={() => setStage("details")}
      onConfirmed={props.onConfirmed}
    />}
    {prompt === "back" && <BookingStepConfirmation title="Go back to the service waiver?"
      description="This leaves the boarding details step. Your selections remain in the current draft, but changing services or pets may require entering them again."
      confirmLabel="Go Back" danger onCancel={() => setPrompt(null)}
      onConfirm={() => { setPrompt(null); props.onBack(); }} />}
    {prompt === "dates" && <BookingStepConfirmation title="Proceed to boarding dates?"
      description="Review the selected kennel sizes, sharing options, rates, and durations. The next step verifies availability for the entire stay."
      confirmLabel="Proceed" onCancel={() => setPrompt(null)}
      onConfirm={() => { setPrompt(null); setStage("dates"); }} />}
  </div>;
}
