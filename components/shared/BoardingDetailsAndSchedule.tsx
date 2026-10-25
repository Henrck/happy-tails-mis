"use client";

import { useCallback, useState } from "react";
import BoardingSelectionStep from "@/components/admin/pos/walk-in/BoardingSelectionStep";
import BoardingAvailabilitySchedule from "@/components/shared/BoardingAvailabilitySchedule";
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

/** The two former Boarding steps are one screen. No separate schedule navigation. */
export default function BoardingDetailsAndSchedule(props: Props) {
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [detailsValid, setDetailsValid] = useState(false);
  const prepared = useCallback((rows: PackagePricing[], valid: boolean) => {
    setPricing((previous) => previous === rows ? previous : rows);
    setDetailsValid(valid);
  }, []);
  // Remount the calendar on duration/size changes, preventing a previously
  // validated pickup or kennel count from being reused for a different stay.
  const selectionSignature = props.selections.map((s) =>
    `${s.pet.id}:${s.boardingKennelSize ?? ""}:${s.packagePricingId ?? ""}:${s.boardingNights ?? ""}`
  ).sort().join("|");

  return <div className="mx-auto max-w-4xl space-y-6">
    <section aria-label="Boarding details" className="rounded-2xl border border-pink-100 bg-white p-3 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink text-sm font-bold text-white">1</span><h2 className="text-lg font-bold text-zinc-800">Boarding details and stay duration</h2></div>
      <BoardingSelectionStep pets={props.pets} selections={props.selections} onChange={props.onChange}
        scheduledDate={props.scheduledDate} onBack={props.onBack} onNext={() => {}}
        alreadyGroomedPetIds={props.alreadyGroomedPetIds} combined onPrepared={prepared}/>
    </section>
    <section aria-label="Boarding schedule and pickup" className="rounded-2xl border border-pink-100 bg-white p-3 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-pink text-sm font-bold text-white">2</span><h2 className="text-lg font-bold text-zinc-800">Check-in calendar and pickup availability</h2></div>
      {!detailsValid ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Select a kennel size and valid package/duration for every pet above. Available check-in dates and the calculated pickup day will appear here automatically.
      </div> : <BoardingAvailabilitySchedule key={selectionSignature}
        petSelections={props.selections} pricing={pricing} kennels={props.kennels} addonPrices={[]}
        scheduledDate={props.scheduledDate} dropOffAt={null} pickUpAt={null}
        petBelongings={props.petBelongings} specialRequests={props.specialRequests}
        onDateChange={() => {}} onDropOffChange={() => {}} onPickUpChange={() => {}}
        onBelongingsChange={props.onBelongingsChange} onRequestsChange={props.onRequestsChange}
        onSelectionsChange={props.onChange} onBack={props.onBack} onConfirmed={props.onConfirmed}/>
      }
    </section>
  </div>;
}
