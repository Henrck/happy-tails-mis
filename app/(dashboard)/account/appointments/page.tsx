"use client";
// Shared Customer booking workflow. Boarding details + date availability now
// live in ONE selection step; other services retain their separate schedules.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchPetsByCustomer } from "@/lib/supabase/appointments";
import { fetchGroomers, fetchKennels } from "@/lib/supabase/pet-services";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";
import type { Customer } from "@/lib/types/users";
import Link from "next/link";
import { hasValidCustomerPhone } from "@/lib/utils/customer-phone";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import { emptyLeg, eligibleServicesFor, autoQueuedGroomingLegs, type BookingLeg } from "@/lib/types/booking-leg";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import CustomerServiceChoiceStep from "@/components/dashboard/booking/CustomerServiceChoiceStep";
import BookingPetInformationStep from "@/components/dashboard/booking/BookingPetInformationStep";
import CustomerGroomingSelectionStep from "@/components/dashboard/booking/CustomerGroomingSelectionStep";
import BoardingDetailsAndSchedule from "@/components/shared/BoardingDetailsAndSchedule";
import AlaCarteSelectionStep from "@/components/admin/pos/walk-in/AlaCarteSelectionStep";
import CustomerGroomingScheduleStep from "@/components/dashboard/booking/CustomerGroomingScheduleStep";
import AddAnotherServicePrompt from "@/components/dashboard/booking/AddAnotherServicePrompt";
import MultiServiceSummaryStep from "@/components/dashboard/booking/MultiServiceSummaryStep";
import CurrentLegSidebar from "@/components/dashboard/booking/CurrentLegSidebar";
import OnlineCapacityGroomingSchedule from "@/components/dashboard/booking/OnlineCapacityGroomingSchedule";
import CustomerWaiverStep from "@/components/dashboard/booking/CustomerWaiverStep";
import BookingProgress, { type BookingPhase } from "@/components/dashboard/booking/BookingProgress";

type Step = BookingPhase;
export default function BookAppointmentPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("pet-info");
  const [waiverBackStep, setWaiverBackStep] = useState<"service" | "add-more">("service");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [queuedLegs, setQueuedLegs] = useState<BookingLeg[]>([]);
  const [completedLegs, setCompletedLegs] = useState<BookingLeg[]>([]);
  const [currentLeg, setCurrentLeg] = useState<BookingLeg | null>(null);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [kennels, setKennels] = useState<Kennel[]>([]);
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
      const [groomerResult, kennelResult, boardingAddonResult] = await Promise.all([
        fetchGroomers({ activeOnly: true }), fetchKennels(), fetchAddonsByCategory("Boarding Add-ons"),
      ]);
      setGroomers(groomerResult.groomers);
      setKennels(kennelResult.kennels);
      setBoardingAddons(boardingAddonResult.addons);
      setLoading(false);
    }
    void load();
  }, [router]);

  const loadGroomingLookups = useCallback(async (serviceType: "dog_grooming" | "cat_grooming") => {
    if (packagesByService[serviceType]) return;
    const [pkgResult, sizeResult, addonResult] = await Promise.all([
      fetchPackagesFull(serviceType), fetchPetSizes(serviceType), fetchAddonsByCategory("Grooming Add-ons"),
    ]);
    setPackagesByService((prev) => ({ ...prev, [serviceType]: pkgResult.packages }));
    setSizesByService((prev) => ({ ...prev, [serviceType]: sizeResult.sizes }));
    setAddonsByService((prev) => ({ ...prev, [serviceType]: addonResult.addons }));
  }, [packagesByService]);
  const loadLookupsForChoice = useCallback((choice: WalkInServiceChoice) => {
    if (choice === "grooming") void Promise.all([loadGroomingLookups("dog_grooming"), loadGroomingLookups("cat_grooming")]);
    else if (choice === "dog_grooming" || choice === "cat_grooming") void loadGroomingLookups(choice);
  }, [loadGroomingLookups]);
  useEffect(() => { setAddonsByService((prev) => ({ ...prev, boarding: boardingAddons })); }, [boardingAddons]);

  const selectedPets = pets.filter((p) => selectedPetIds.includes(p.id));
  const selectedSpecies = selectedPets.map((p) => p.species);
  const uniqueSelectedSpecies = Array.from(new Set(selectedSpecies));
  function startNextLeg(queue: BookingLeg[]) {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueuedLegs(rest); setCurrentLeg(next); loadLookupsForChoice(next.serviceChoice); setWaiverBackStep("service"); setStep("waiver");
    } else setStep("service");
  }
  function handlePetInfoNext() {
    if (uniqueSelectedSpecies.length === 2) startNextLeg(autoQueuedGroomingLegs(selectedPets));
    else setStep("service");
  }
  function handleServiceChosen(choice: WalkInServiceChoice) {
    const eligiblePetIds = selectedPets.filter((p) => {
      if (choice === "dog_grooming") return p.species === "Dog";
      if (choice === "cat_grooming") return p.species === "Cat";
      return true;
    }).map((p) => p.id);
    const leg = emptyLeg(choice, eligiblePetIds);
    setWaiverBackStep(step === "add-more" ? "add-more" : "service");
    setCurrentLeg(leg); loadLookupsForChoice(choice); setStep("waiver");
  }
  function handleWaiverDeclined() { setCurrentLeg(null); setStep(waiverBackStep); }
  function handleLegSelectionChange(selections: DraftPetSelection[]) {
    setCurrentLeg((leg) => leg ? { ...leg, petSelections: selections } : leg);
  }
  function handleRemovePetFromLeg(petId: string) {
    if (!currentLeg || currentLeg.petIds.length <= 1) return;
    setCurrentLeg({ ...currentLeg, petIds: currentLeg.petIds.filter((id) => id !== petId),
      petSelections: currentLeg.petSelections.filter((sel) => sel.pet.id !== petId) });
  }
  function handleLegScheduleConfirmed(confirmedSelections?: DraftPetSelection[]) {
    if (!currentLeg) return;
    setCompletedLegs((prev) => [...prev, confirmedSelections ? { ...currentLeg, petSelections: confirmedSelections } : currentLeg]); setCurrentLeg(null);
    if (queuedLegs.length > 0) startNextLeg(queuedLegs);
    else setStep("add-more");
  }
  function handleEditLeg(legId: string) {
    const leg = completedLegs.find((l) => l.id === legId);
    if (!leg) return;
    setCompletedLegs((prev) => prev.filter((l) => l.id !== legId));
    setCurrentLeg(leg); loadLookupsForChoice(leg.serviceChoice); setStep("selection");
  }
  const hasGroomingLeg = completedLegs.some((leg) =>
    leg.serviceChoice === "grooming" || leg.serviceChoice === "dog_grooming" || leg.serviceChoice === "cat_grooming"
  );
  const eligibleForMore = eligibleServicesFor(pets, selectedPetIds, completedLegs)
    .filter((choice) => !hasGroomingLeg || !["grooming", "dog_grooming", "cat_grooming"].includes(choice));
  if (loading || !customer) return <p className="py-10 text-center text-sm text-zinc-400 sm:py-16">Loading…</p>;
  if (!hasValidCustomerPhone(customer.phone_number)) return (
    <section className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">!</span>
      <h1 className="mt-4 text-xl font-bold text-zinc-800">Phone number required</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">Please add a valid mobile number to My Account before booking an appointment. HappyTails staff use it to contact you about your pet and appointment.</p>
      <Link href="/account/profile" className="mt-5 inline-flex rounded-full bg-brand-pink px-6 py-3 text-sm font-semibold text-white">Complete My Account</Link>
    </section>
  );
  const legPets = currentLeg ? pets.filter((p) => currentLeg.petIds.includes(p.id)) : [];
  const isGrooming = currentLeg?.serviceChoice === "grooming" || currentLeg?.serviceChoice === "dog_grooming" || currentLeg?.serviceChoice === "cat_grooming";
  const showSidebar = (step === "selection" || step === "schedule") && legPets.length > 0;
  return <div className="ht-booking-shell">
    <div className="ht-booking-left"><BookingProgress step={step} hasCompletedServices={completedLegs.length > 0} combinedBoarding={step === "selection" && currentLeg?.serviceChoice === "boarding"} />
      {showSidebar && <CurrentLegSidebar pets={legPets} onRemove={handleRemovePetFromLeg} />}</div>
    <div className="ht-booking-main"><div className="ht-booking-panel">
      {step === "pet-info" && <div className="ht-booking-pets"><BookingPetInformationStep customer={customer} pets={pets} onPetsChange={setPets}
        selectedIds={selectedPetIds} onSelectionChange={setSelectedPetIds}
        onBack={() => router.push("/account")} onNext={handlePetInfoNext} /></div>}
      {step === "service" && <div className="ht-booking-services"><CustomerServiceChoiceStep choice={currentLeg?.serviceChoice ?? null}
        onChange={handleServiceChosen} onBack={() => setStep("pet-info")}
        onNext={() => setStep("waiver")} petSpecies={selectedSpecies} /></div>}
      {step === "waiver" && currentLeg && <CustomerWaiverStep serviceType={currentLeg.serviceChoice} onBack={handleWaiverDeclined} onAgree={() => setStep("selection")} />}
      {step === "selection" && currentLeg?.serviceChoice === "boarding" && <BoardingDetailsAndSchedule
        pets={legPets} selections={currentLeg.petSelections} kennels={kennels}
        alreadyGroomedPetIds={completedLegs.filter((leg) => ["dog_grooming", "cat_grooming", "grooming"].includes(leg.serviceChoice)).flatMap((leg) => leg.petIds)}
        onChange={handleLegSelectionChange} scheduledDate={currentLeg.scheduledDate}
        petBelongings={currentLeg.petBelongings} specialRequests={currentLeg.specialRequests}
        onBelongingsChange={(items) => setCurrentLeg((leg) => leg && { ...leg, petBelongings: items })}
        onRequestsChange={(text) => setCurrentLeg((leg) => leg && { ...leg, specialRequests: text })}
        onBack={() => setStep("waiver")} onConfirmed={handleLegScheduleConfirmed} />}
      {step === "selection" && currentLeg?.serviceChoice === "ala_carte" && <AlaCarteSelectionStep
        pets={legPets} selections={currentLeg.petSelections} onChange={handleLegSelectionChange}
        onBack={() => setStep("waiver")} onNext={() => setStep("schedule")} />}
      {step === "selection" && isGrooming && currentLeg && <CustomerGroomingSelectionStep
        serviceType={currentLeg.serviceChoice as "grooming" | "dog_grooming" | "cat_grooming"}
        pets={legPets} selections={currentLeg.petSelections} onChange={handleLegSelectionChange}
        onBack={() => setStep("waiver")} onNext={() => setStep("schedule")} />}
      {step === "schedule" && currentLeg && isGrooming && <div className="ht-booking-schedule"><OnlineCapacityGroomingSchedule
        petSelections={currentLeg.petSelections} scheduledDate={currentLeg.scheduledDate}
        scheduledTime={currentLeg.scheduledTime} specialRequests={currentLeg.specialRequests}
        onDateChange={(date) => setCurrentLeg((l) => l && { ...l, scheduledDate: date })}
        onTimeChange={(time) => setCurrentLeg((l) => l && { ...l, scheduledTime: time })}
        onRequestsChange={(text) => setCurrentLeg((l) => l && { ...l, specialRequests: text })}
        onSelectionsChange={handleLegSelectionChange}
        onBack={() => setStep("selection")} onConfirmed={(items) => handleLegScheduleConfirmed(items)} /></div>}
      {step === "schedule" && currentLeg && currentLeg.serviceChoice === "ala_carte" && <div className="ht-booking-schedule"><CustomerGroomingScheduleStep
        customer={customer} ownerContact={customer.phone_number ?? ""} petSelections={currentLeg.petSelections}
        groomers={groomers} scheduledDate={currentLeg.scheduledDate}
        scheduledTime={currentLeg.scheduledTime} specialRequests={currentLeg.specialRequests}
        onDateChange={(date) => setCurrentLeg((l) => l && { ...l, scheduledDate: date })}
        onTimeChange={(time) => setCurrentLeg((l) => l && { ...l, scheduledTime: time })}
        onRequestsChange={(text) => setCurrentLeg((l) => l && { ...l, specialRequests: text })}
        onBack={() => setStep("selection")} onConfirmed={handleLegScheduleConfirmed} /></div>}
      {step === "add-more" && <AddAnotherServicePrompt eligibleServices={eligibleForMore}
        onAddService={handleServiceChosen} onDone={() => setStep("summary")} onBack={() => { const last = completedLegs[completedLegs.length - 1]; if (last) handleEditLeg(last.id); else setStep("service"); }} />}
      {step === "summary" && <MultiServiceSummaryStep customer={customer} legs={completedLegs}
        packagesByService={packagesByService} sizesByService={sizesByService}
        addonsByService={addonsByService} groomers={groomers} kennels={kennels}
        onBack={() => setStep("add-more")} onEditLeg={handleEditLeg} />}
    </div></div>
  </div>;
}
