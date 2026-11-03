"use client";

import { useCallback, useMemo, useState } from "react";
import BoardingSelectionStep from "@/components/admin/pos/walk-in/BoardingSelectionStep";
import BoardingGroupSchedule from "@/components/shared/BoardingGroupSchedule";
import { boardingPhysicalCapacity, boardingCapacityMessage } from "@/lib/booking/boarding-capacity";
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

/** Shared Customer and POS Boarding steps. Prevent a group larger than the
 * physical kennel roster from entering a calendar where every day is Full. */
export default function BoardingDetailsAndSchedule(props: Props) {
  const [stage, setStage] = useState<"details" | "dates">("details");
  const [pricing, setPricing] = useState<PackagePricing[]>([]);
  const [detailsValid, setDetailsValid] = useState(false);
  const [capacityModal, setCapacityModal] = useState(false);
  const prepared = useCallback((rows: PackagePricing[], valid: boolean) => {
    setPricing(rows);
    setDetailsValid(valid);
  }, []);
  const capacity = useMemo(() => boardingPhysicalCapacity(props.selections, props.kennels),
    [props.selections, props.kennels]);
  const signature = props.selections.map((s) =>
    `${s.pet.id}:${s.boardingKennelSize ?? ""}:${s.packagePricingId ?? ""}:${s.boardingNights ?? ""}`
  ).sort().join("|");

  function proceedToDates() {
    if (!detailsValid) return;
    if (capacity.exceeded) { setCapacityModal(true); return; }
    setStage("dates");
  }

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
      onPrepared={prepared} onBack={props.onBack}
      onNext={proceedToDates}
    /> : !detailsValid ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      Please complete valid Boarding Details first.
      <button type="button" className="ml-2 font-bold underline" onClick={() => setStage("details")}>Back to Details</button>
    </div> : capacity.exceeded ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <strong>Too many pets for the configured kennels.</strong>
      <p className="mt-2">{boardingCapacityMessage(capacity)}</p>
      <button type="button" className="mt-3 rounded-full bg-brand-pink px-5 py-2.5 font-semibold text-white" onClick={() => { setStage("details"); setCapacityModal(true); }}>Review pets</button>
    </div> : <BoardingGroupSchedule
      key={signature}
      petSelections={props.selections} pricing={pricing} kennels={props.kennels}
      petBelongings={props.petBelongings} specialRequests={props.specialRequests}
      onBelongingsChange={props.onBelongingsChange} onRequestsChange={props.onRequestsChange}
      onSelectionsChange={props.onChange}
      onBack={() => setStage("details")}
      onConfirmed={props.onConfirmed}
    />}

    {capacityModal && <div role="presentation" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="boarding-capacity-title" aria-describedby="boarding-capacity-description" className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700" aria-hidden="true">!</div>
        <h2 id="boarding-capacity-title" className="mt-3 text-center text-xl font-extrabold text-zinc-900">Book these pets separately</h2>
        <p id="boarding-capacity-description" className="mt-3 text-sm leading-6 text-zinc-700">{boardingCapacityMessage(capacity)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-pink-50 p-3"><b className="block text-zinc-800">Big kennels</b>{capacity.bigNeeded} needed / {capacity.bigAvailable} active</div>
          <div className="rounded-xl bg-pink-50 p-3"><b className="block text-zinc-800">Small kennels</b>{capacity.smallNeeded} needed / {capacity.smallAvailable} active</div>
        </div>
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Use the <strong>Editing</strong> pet list beside the form to remove extra pets from this appointment. If pets share a kennel, separate that group in Boarding Details before removing one member. Finish booking the remaining pets, then start a separate Boarding appointment for the others. Their dates and availability must be checked separately.</p>
        <button type="button" autoFocus onClick={() => setCapacityModal(false)} className="mt-5 w-full rounded-full bg-brand-pink px-4 py-3 text-sm font-bold text-white">Adjust selected pets</button>
      </section>
    </div>}
  </div>;
}
