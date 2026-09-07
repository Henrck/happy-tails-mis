"use client";
// Walk-in booking wizard, opened from the POS "Walk In" button. Lives as
// its own route rather than a modal-over-POS — this flow has real forms,
// package grids, and scheduling across several steps, which doesn't fit
// comfortably layered on top of another full screen.
//
// Full flow now wired end to end: Verify -> Service -> Waiver -> Pet
// Info -> Selection -> Schedule -> Summary. Summary's "Complete
// Appointment" calls createAppointment() for real — this is the first
// point in the whole wizard where anything becomes a permanent booking.
//
// Groomers, kennels, boarding pricing, and (for grooming) package/size/
// addon data are all fetched once here at the wizard level rather than
// separately inside each step, since both Scheduling and Summary need
// data that Selection fetches internally but has no other reason to
// surface upward.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { WalkInStep } from "@/lib/types/walk-in-draft";
import { emptyDraft } from "@/lib/types/walk-in-draft";
import type { Customer } from "@/lib/types/users";
import { fetchGroomers, fetchKennels } from "@/lib/supabase/pet-services";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { Package, PetSize, Addon, AddonPrice, PackagePricing } from "@/lib/types/services";
import CustomerVerifyStep from "@/components/admin/pos/walk-in/CustomerVerifyStep";
import ServiceChoiceStep, { type WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import WaiverStep from "@/components/admin/pos/walk-in/WaiverStep";
import PetInformationStep from "@/components/admin/pos/walk-in/PetInformationStep";
import GroomingSelectionStep from "@/components/admin/pos/walk-in/GroomingSelectionStep";
import BoardingSelectionStep from "@/components/admin/pos/walk-in/BoardingSelectionStep";
import AlaCarteSelectionStep from "@/components/admin/pos/walk-in/AlaCarteSelectionStep";
import GroomingScheduleStep from "@/components/admin/pos/walk-in/GroomingScheduleStep";
import BoardingScheduleStep from "@/components/admin/pos/walk-in/BoardingScheduleStep";
import SummaryStep from "@/components/admin/pos/walk-in/SummaryStep";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";

export default function WalkInPage() {
  const router = useRouter();
  const [step, setStep] = useState<WalkInStep>("verify");
  const [draft, setDraft] = useState(emptyDraft());

  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [boardingPricing, setBoardingPricing] = useState<PackagePricing[]>([]);
  const [boardingAddonPrices, setBoardingAddonPrices] = useState<AddonPrice[]>([]);

  const [groomingPackages, setGroomingPackages] = useState<Package[]>([]);
  const [groomingSizes, setGroomingSizes] = useState<PetSize[]>([]);
  const [groomingAddons, setGroomingAddons] = useState<Addon[]>([]);

  const [boardingAddons, setBoardingAddons] = useState<Addon[]>([]);

  useEffect(() => {
    fetchGroomers({ activeOnly: true }).then((r) => setGroomers(r.groomers));
    fetchKennels().then((r) => setKennels(r.kennels));
    fetchPackagesFull("boarding").then((r) => setBoardingPricing(r.pricing));
    fetchAddonsByCategory("Boarding Add-ons").then((r) => { setBoardingAddonPrices(r.prices); setBoardingAddons(r.addons); });
  }, []);

  // Grooming packages/sizes/addons depend on WHICH service was chosen
  // (Dog vs Cat have different packages) — refetch whenever that
  // changes, unlike the boarding/groomer data above which is fetched
  // once and doesn't vary by service choice.
  const loadGroomingLookups = useCallback(async () => {
    if (draft.serviceChoice !== "dog_grooming" && draft.serviceChoice !== "cat_grooming") return;
    const [pkgResult, sizeResult, addonResult] = await Promise.all([
      fetchPackagesFull(draft.serviceChoice),
      fetchPetSizes(draft.serviceChoice),
      fetchAddonsByCategory("Grooming Add-ons"),
    ]);
    setGroomingPackages(pkgResult.packages);
    setGroomingSizes(sizeResult.sizes);
    setGroomingAddons(addonResult.addons);
  }, [draft.serviceChoice]);

  useEffect(() => { loadGroomingLookups(); }, [loadGroomingLookups]);

  function handleSelectExisting(customer: Customer) {
    setDraft((d) => ({
      ...d,
      customer,
      ownerName: customer.full_name,
      ownerContact: customer.phone_number ?? "",
      ownerAddress: customer.address ?? "",
    }));
    setStep("service");
  }

  function handleNewCustomer() {
    setDraft((d) => ({ ...d, customer: null }));
    setStep("service");
  }

  function handleServiceChange(choice: WalkInServiceChoice) {
    setDraft((d) => ({ ...d, serviceChoice: choice }));
  }

  function handleAgreeWaiver() {
    setDraft((d) => ({ ...d, waiverAgreed: true }));
    setStep("pet-info");
  }

  function handlePetInfoNext(pets: Pet[], ownerOverride?: { name: string; contact: string; address: string }) {
    setDraft((d) => ({
      ...d,
      pets,
      ...(ownerOverride ? { ownerName: ownerOverride.name, ownerContact: ownerOverride.contact, ownerAddress: ownerOverride.address } : {}),
    }));
    setStep("selection");
  }

  function handleSelectionChange(selections: DraftPetSelection[]) {
    setDraft((d) => ({ ...d, petSelections: selections }));
  }

  // Ala Carte uses the real "Ala Carte" addon category for lookup names
  // in Summary — fetched fresh here since it's not tied to grooming or
  // boarding's service-scoped data above.
  const [alaCarteAddons, setAlaCarteAddons] = useState<Addon[]>([]);
  useEffect(() => {
    if (draft.serviceChoice === "ala_carte") {
      fetchAddonsByCategory("Ala Carte").then((r) => setAlaCarteAddons(r.addons));
    }
  }, [draft.serviceChoice]);

  const summaryAddons = draft.serviceChoice === "boarding" ? boardingAddons
    : draft.serviceChoice === "ala_carte" ? alaCarteAddons
    : groomingAddons;

  return (
    <div className="min-h-screen bg-[#FDF1F7] p-6 md:p-10">
      <button onClick={() => router.push("/admin/pos")} className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-brand-pink transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M19 12H5M5 12l6-6M5 12l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to POS
      </button>

      <div className="mt-6">
        {step === "verify" && (
          <CustomerVerifyStep onSelectExisting={handleSelectExisting} onNewCustomer={handleNewCustomer} />
        )}

        {step === "service" && (
          <ServiceChoiceStep
            choice={draft.serviceChoice}
            onChange={handleServiceChange}
            onBack={() => setStep("verify")}
            onNext={() => setStep("waiver")}
          />
        )}

        {step === "waiver" && draft.serviceChoice && (
          <WaiverStep serviceType={draft.serviceChoice} onBack={() => setStep("service")} onAgree={handleAgreeWaiver} />
        )}

        {step === "pet-info" && (
          <PetInformationStep customer={draft.customer} onBack={() => setStep("waiver")} onNext={handlePetInfoNext} />
        )}

        {step === "selection" && draft.serviceChoice === "boarding" && (
          <BoardingSelectionStep
            pets={draft.pets}
            selections={draft.petSelections}
            onChange={handleSelectionChange}
            scheduledDate={draft.scheduledDate}
            onBack={() => setStep("pet-info")}
            onNext={() => setStep("schedule")}
          />
        )}

        {step === "selection" && draft.serviceChoice === "ala_carte" && (
          <AlaCarteSelectionStep
            pets={draft.pets}
            selections={draft.petSelections}
            onChange={handleSelectionChange}
            onBack={() => setStep("pet-info")}
            onNext={() => setStep("schedule")}
          />
        )}

        {step === "selection" && (draft.serviceChoice === "dog_grooming" || draft.serviceChoice === "cat_grooming") && (
          <GroomingSelectionStep
            serviceType={draft.serviceChoice}
            pets={draft.pets}
            selections={draft.petSelections}
            onChange={handleSelectionChange}
            onBack={() => setStep("pet-info")}
            onNext={() => setStep("schedule")}
          />
        )}

        {step === "schedule" && draft.serviceChoice === "boarding" && (
          <BoardingScheduleStep
            petSelections={draft.petSelections}
            kennels={kennels}
            pricing={boardingPricing}
            addonPrices={boardingAddonPrices}
            scheduledDate={draft.scheduledDate}
            dropOffAt={draft.dropOffAt}
            pickUpAt={draft.pickUpAt}
            petBelongings={draft.petBelongings}
            specialRequests={draft.specialRequests}
            onDateChange={(date) => setDraft((d) => ({ ...d, scheduledDate: date }))}
            onDropOffChange={(iso) => setDraft((d) => ({ ...d, dropOffAt: iso }))}
            onPickUpChange={(iso) => setDraft((d) => ({ ...d, pickUpAt: iso }))}
            onBelongingsChange={(items) => setDraft((d) => ({ ...d, petBelongings: items }))}
            onRequestsChange={(text) => setDraft((d) => ({ ...d, specialRequests: text }))}
            onSelectionsChange={handleSelectionChange}
            onBack={() => setStep("selection")}
            onConfirmed={() => setStep("summary")}
          />
        )}

        {step === "schedule" && (draft.serviceChoice === "dog_grooming" || draft.serviceChoice === "cat_grooming" || draft.serviceChoice === "ala_carte") && (
          <GroomingScheduleStep
            customer={draft.customer}
            ownerContact={draft.ownerContact}
            petSelections={draft.petSelections}
            groomers={groomers}
            scheduledDate={draft.scheduledDate}
            scheduledTime={draft.scheduledTime}
            specialRequests={draft.specialRequests}
            onDateChange={(date) => setDraft((d) => ({ ...d, scheduledDate: date }))}
            onTimeChange={(time) => setDraft((d) => ({ ...d, scheduledTime: time }))}
            onRequestsChange={(text) => setDraft((d) => ({ ...d, specialRequests: text }))}
            onBack={() => setStep("selection")}
            onConfirmed={() => setStep("summary")}
          />
        )}

        {step === "summary" && (
          <SummaryStep
            draft={draft}
            packages={groomingPackages}
            sizes={groomingSizes}
            addons={summaryAddons}
            groomers={groomers}
            kennels={kennels}
            onBack={() => setStep("schedule")}
            onDone={() => router.push("/admin/pos")}
          />
        )}
      </div>
    </div>
  );
}
