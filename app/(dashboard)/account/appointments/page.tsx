"use client";
// Book Appointment wizard, customer-facing, supporting MULTIPLE
// SERVICES in one booking session.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer } from "@/lib/supabase/appointments";
import { fetchGroomers, fetchKennels } from "@/lib/supabase/pet-services";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { Package, PetSize, Addon, AddonPrice, PackagePricing } from "@/lib/types/services";
import { emptyLeg, eligibleServicesFor, autoQueuedGroomingLegs, type BookingLeg } from "@/lib/types/booking-leg";
import ServiceChoiceStep, { type WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import BookingPetInformationStep from "@/components/dashboard/booking/BookingPetInformationStep";
import GroomingSelectionStep from "@/components/admin/pos/walk-in/GroomingSelectionStep";
import BoardingSelectionStep from "@/components/admin/pos/walk-in/BoardingSelectionStep";
import AlaCarteSelectionStep from "@/components/admin/pos/walk-in/AlaCarteSelectionStep";
import GroomingScheduleStep from "@/components/admin/pos/walk-in/GroomingScheduleStep";
import BoardingScheduleStep from "@/components/admin/pos/walk-in/BoardingScheduleStep";
import AddAnotherServicePrompt from "@/components/dashboard/booking/AddAnotherServicePrompt";
import MultiServiceSummaryStep from "@/components/dashboard/booking/MultiServiceSummaryStep";
import CurrentLegSidebar from "@/components/dashboard/booking/CurrentLegSidebar";

type Step = "pet-info" | "service" | "selection" | "schedule" | "add-more" | "summary";

export default function BookAppointmentPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("pet-info");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [queuedLegs, setQueuedLegs] = useState<BookingLeg[]>([]);
  const [completedLegs, setCompletedLegs] = useState<BookingLeg[]>([]);
  const [currentLeg, setCurrentLeg] = useState<BookingLeg | null>(null);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [boardingPricing, setBoardingPricing] = useState<PackagePricing[]>([]);
  const [boardingAddonPrices, setBoardingAddonPrices] = useState<AddonPrice[]>([]);
  const [boardingAddons, setBoardingAddons] = useState<Addon[]>([]);
  const [packagesByService, setPackagesByService] = useState<Record<string, Package[]>>({});
  const [sizesByService, setSizesByService] = useState<Record<string, PetSize[]>>({});
  const [addonsByService, setAddonsByService] = useState<Record<string, Addon[]>>({});

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/sign-in"); return; }
      const { data: customerRow } = await supabase.from("customers").select("*").eq("id", user.id).single();
      if (!customerRow) { router.push("/sign-in"); return; }
      setCustomer(customerRow);
      const { pets: petRows } = await fetchPetsByCustomer(user.id);
      setPets(petRows);

      const [groomerResult, kennelResult, boardingPkgResult, boardingAddonResult] = await Promise.all([
        fetchGroomers({ activeOnly: true }),
        fetchKennels(),
        fetchPackagesFull("boarding"),
        fetchAddonsByCategory("Boarding Add-ons"),
      ]);
      setGroomers(groomerResult.groomers);
      setKennels(kennelResult.kennels);
      setBoardingPricing(boardingPkgResult.pricing);
      setBoardingAddonPrices(boardingAddonResult.prices);
      setBoardingAddons(boardingAddonResult.addons);
      setLoading(false);
    }
    load();
  }, [router]);

  const loadGroomingLookups = useCallback(async (serviceType: "dog_grooming" | "cat_grooming") => {
    if (packagesByService[serviceType]) return;
    const [pkgResult, sizeResult, addonResult] = await Promise.all([
      fetchPackagesFull(serviceType),
      fetchPetSizes(serviceType),
      fetchAddonsByCategory("Grooming Add-ons"),
    ]);
    setPackagesByService((prev) => ({ ...prev, [serviceType]: pkgResult.packages }));
    setSizesByService((prev) => ({ ...prev, [serviceType]: sizeResult.sizes }));
    setAddonsByService((prev) => ({ ...prev, [serviceType]: addonResult.addons }));
  }, [packagesByService]);

  useEffect(() => {
    setAddonsByService((prev) => ({ ...prev, boarding: boardingAddons }));
  }, [boardingAddons]);

  const selectedPets = pets.filter((p) => selectedPetIds.includes(p.id));
  const selectedSpecies = selectedPets.map((p) => p.species);
  const uniqueSelectedSpecies = Array.from(new Set(selectedSpecies));

  function startNextLeg(queue: BookingLeg[]) {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueuedLegs(rest);
      setCurrentLeg(next);
      if (next.serviceChoice === "dog_grooming" || next.serviceChoice === "cat_grooming") loadGroomingLookups(next.serviceChoice);
      setStep("selection");
    } else {
      setStep("service");
    }
  }

  function handlePetInfoNext() {
    if (uniqueSelectedSpecies.length === 2) {
      startNextLeg(autoQueuedGroomingLegs(selectedPets));
    } else {
      setStep("service");
    }
  }

  function handleServiceChosen(choice: WalkInServiceChoice) {
    const eligiblePetIds = selectedPets
      .filter((p) => {
        if (choice === "dog_grooming") return p.species === "Dog";
        if (choice === "cat_grooming") return p.species === "Cat";
        return true;
      })
      .map((p) => p.id);

    const leg = emptyLeg(choice, eligiblePetIds);
    setCurrentLeg(leg);
    if (choice === "dog_grooming" || choice === "cat_grooming") loadGroomingLookups(choice);
    setStep("selection");
  }

  function handleLegSelectionChange(selections: DraftPetSelection[]) {
    if (!currentLeg) return;
    setCurrentLeg({ ...currentLeg, petSelections: selections });
  }

  function handleRemovePetFromLeg(petId: string) {
    if (!currentLeg || currentLeg.petIds.length <= 1) return;
    setCurrentLeg({
      ...currentLeg,
      petIds: currentLeg.petIds.filter((id) => id !== petId),
      petSelections: currentLeg.petSelections.filter((sel) => sel.pet.id !== petId),
    });
  }

  function handleAddAnother(choice: WalkInServiceChoice) {
    handleServiceChosen(choice);
  }

  function handleLegScheduleConfirmed() {
    if (!currentLeg) return;
    setCompletedLegs((prev) => [...prev, currentLeg]);
    setCurrentLeg(null);
    if (queuedLegs.length > 0) startNextLeg(queuedLegs);
    else setStep("add-more");
  }

  function handleEditLeg(legId: string) {
    const leg = completedLegs.find((l) => l.id === legId);
    if (!leg) return;
    setCompletedLegs((prev) => prev.filter((l) => l.id !== legId));
    setCurrentLeg(leg);
    if (leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming") loadGroomingLookups(leg.serviceChoice);
    setStep("selection");
  }

  const eligibleForMore = eligibleServicesFor(pets, selectedPetIds, completedLegs);

  if (loading || !customer) return <p className="py-10 text-center text-sm text-zinc-400 sm:py-16">Loading…</p>;

  const legPets = currentLeg ? pets.filter((p) => currentLeg.petIds.includes(p.id)) : [];
  const isGrooming = currentLeg?.serviceChoice === "dog_grooming" || currentLeg?.serviceChoice === "cat_grooming";
  const showSidebar = (step === "selection" || step === "schedule") && legPets.length > 0;

  return (
    <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:gap-5 lg:flex-row lg:items-start lg:gap-6">
      <div className="min-w-0 w-full flex-1 rounded-2xl border border-pink-100 bg-white p-3 sm:rounded-3xl sm:p-5 md:p-8">
        {step === "pet-info" && (
          <BookingPetInformationStep customer={customer} pets={pets} onPetsChange={setPets}
            selectedIds={selectedPetIds} onSelectionChange={setSelectedPetIds}
            onBack={() => router.push("/account")} onNext={handlePetInfoNext} />
        )}

        {step === "service" && (
          <ServiceChoiceStep choice={currentLeg?.serviceChoice ?? null} onChange={handleServiceChosen}
            onBack={() => setStep("pet-info")} onNext={() => setStep("selection")} petSpecies={selectedSpecies} />
        )}

        {step === "selection" && currentLeg?.serviceChoice === "boarding" && (
          <BoardingSelectionStep pets={legPets} selections={currentLeg.petSelections}
            onChange={handleLegSelectionChange} scheduledDate={currentLeg.scheduledDate}
            onBack={() => setStep("service")} onNext={() => setStep("schedule")} />
        )}

        {step === "selection" && currentLeg?.serviceChoice === "ala_carte" && (
          <AlaCarteSelectionStep pets={legPets} selections={currentLeg.petSelections}
            onChange={handleLegSelectionChange} onBack={() => setStep("service")} onNext={() => setStep("schedule")} />
        )}

        {step === "selection" && isGrooming && currentLeg && (
          <GroomingSelectionStep serviceType={currentLeg.serviceChoice as "dog_grooming" | "cat_grooming"}
            pets={legPets} selections={currentLeg.petSelections} onChange={handleLegSelectionChange}
            onBack={() => { setCurrentLeg(null); setStep(queuedLegs.length > 0 || completedLegs.length > 0 ? "add-more" : "pet-info"); }}
            onNext={() => setStep("schedule")} />
        )}

        {step === "schedule" && currentLeg?.serviceChoice === "boarding" && (
          <BoardingScheduleStep petSelections={currentLeg.petSelections} kennels={kennels}
            pricing={boardingPricing} addonPrices={boardingAddonPrices} scheduledDate={currentLeg.scheduledDate}
            dropOffAt={currentLeg.dropOffAt} pickUpAt={currentLeg.pickUpAt} petBelongings={currentLeg.petBelongings}
            specialRequests={currentLeg.specialRequests}
            onDateChange={(date) => setCurrentLeg((l) => l && { ...l, scheduledDate: date })}
            onDropOffChange={(iso) => setCurrentLeg((l) => l && { ...l, dropOffAt: iso })}
            onPickUpChange={(iso) => setCurrentLeg((l) => l && { ...l, pickUpAt: iso })}
            onBelongingsChange={(items) => setCurrentLeg((l) => l && { ...l, petBelongings: items })}
            onRequestsChange={(text) => setCurrentLeg((l) => l && { ...l, specialRequests: text })}
            onSelectionsChange={handleLegSelectionChange} onBack={() => setStep("selection")}
            onConfirmed={handleLegScheduleConfirmed} />
        )}

        {step === "schedule" && currentLeg && (currentLeg.serviceChoice === "dog_grooming" || currentLeg.serviceChoice === "cat_grooming" || currentLeg.serviceChoice === "ala_carte") && (
          <GroomingScheduleStep customer={customer} ownerContact={customer.phone_number ?? ""}
            petSelections={currentLeg.petSelections} groomers={groomers} scheduledDate={currentLeg.scheduledDate}
            scheduledTime={currentLeg.scheduledTime} specialRequests={currentLeg.specialRequests}
            onDateChange={(date) => setCurrentLeg((l) => l && { ...l, scheduledDate: date })}
            onTimeChange={(time) => setCurrentLeg((l) => l && { ...l, scheduledTime: time })}
            onRequestsChange={(text) => setCurrentLeg((l) => l && { ...l, specialRequests: text })}
            onBack={() => setStep("selection")} onConfirmed={handleLegScheduleConfirmed} />
        )}

        {step === "add-more" && (
          <AddAnotherServicePrompt eligibleServices={eligibleForMore} onAddService={handleAddAnother} onDone={() => setStep("summary")} />
        )}

        {step === "summary" && (
          <MultiServiceSummaryStep customer={customer} legs={completedLegs}
            packagesByService={packagesByService} sizesByService={sizesByService} addonsByService={addonsByService}
            groomers={groomers} kennels={kennels} onBack={() => setStep("add-more")} onEditLeg={handleEditLeg} />
        )}
      </div>

      {showSidebar && <CurrentLegSidebar pets={legPets} onRemove={handleRemovePetFromLeg} />}
    </div>
  );
}
