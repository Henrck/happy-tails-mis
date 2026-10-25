"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types/users";
import type { Pet, DraftPetSelection } from "@/lib/types/appointments";
import type { Groomer, Kennel } from "@/lib/types/pet-services";
import type { Package, PetSize, Addon } from "@/lib/types/services";
import { emptyLeg, eligibleServicesFor, type BookingLeg } from "@/lib/types/booking-leg";
import { fetchGroomers, fetchKennels } from "@/lib/supabase/pet-services";
import { fetchPackagesFull, fetchPetSizes, fetchAddonsByCategory } from "@/lib/supabase/services";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import CustomerVerifyStep from "@/components/admin/pos/walk-in/CustomerVerifyStep";
import PetInformationStep from "@/components/admin/pos/walk-in/PetInformationStep";
import WaiverStep from "@/components/admin/pos/walk-in/WaiverStep";
import BoardingDetailsAndSchedule from "@/components/shared/BoardingDetailsAndSchedule";
import AlaCarteSelectionStep from "@/components/admin/pos/walk-in/AlaCarteSelectionStep";
import CustomerServiceChoiceStep from "@/components/dashboard/booking/CustomerServiceChoiceStep";
import CustomerGroomingSelectionStep from "@/components/dashboard/booking/CustomerGroomingSelectionStep";
import CustomerGroomingScheduleStep from "@/components/dashboard/booking/CustomerGroomingScheduleStep";
import HolidayAwareGroomingSchedule from "@/components/admin/pos/walk-in/HolidayAwareGroomingSchedule";
import BookingProgress from "@/components/dashboard/booking/BookingProgress";
import AddAnotherServicePrompt from "@/components/dashboard/booking/AddAnotherServicePrompt";
import CurrentLegSidebar from "@/components/dashboard/booking/CurrentLegSidebar";
import WalkInMultiServiceSummary from "@/components/admin/pos/walk-in/WalkInMultiServiceSummary";
import "./pos-booking.css";

type Step = "verify" | "pet-info" | "service" | "waiver" | "selection" | "schedule" | "add-more" | "summary";

export default function WalkInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("verify");
  const [waiverBackStep, setWaiverBackStep] = useState<"service" | "add-more">("service");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [owner, setOwner] = useState({ name: "", contact: "", address: "" });
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentLeg, setCurrentLeg] = useState<BookingLeg | null>(null);
  const [completedLegs, setCompletedLegs] = useState<BookingLeg[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [packagesByService, setPackagesByService] = useState<Record<string, Package[]>>({});
  const [sizesByService, setSizesByService] = useState<Record<string, PetSize[]>>({});
  const [addonsByService, setAddonsByService] = useState<Record<string, Addon[]>>({});
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchGroomers({ activeOnly: true }), fetchKennels(),
      fetchAddonsByCategory("Boarding Add-ons"),
      fetchAddonsByCategory("Ala Carte"),
    ]).then(([g, k, ba, ac]) => {
      if (!active) return;
      setGroomers(g.groomers); setKennels(k.kennels);
      setAddonsByService(prev => ({ ...prev, boarding: ba.addons, ala_carte: ac.addons }));
    }).catch(() => { if (active) setLookupError("Some booking options could not be loaded. Refresh before proceeding."); });
    return () => { active = false; };
  }, []);

  const loadGrooming = useCallback(async (service: "dog_grooming" | "cat_grooming") => {
    try {
      const [pkg, sizes, addons] = await Promise.all([
        fetchPackagesFull(service), fetchPetSizes(service), fetchAddonsByCategory("Grooming Add-ons"),
      ]);
      setPackagesByService(prev => ({ ...prev, [service]: pkg.packages }));
      setSizesByService(prev => ({ ...prev, [service]: sizes.sizes }));
      setAddonsByService(prev => ({ ...prev, [service]: addons.addons }));
    } catch { setLookupError("Grooming prices could not be loaded. Refresh before proceeding."); }
  }, []);

  const loadForChoice = useCallback((choice: WalkInServiceChoice) => {
    if (choice === "grooming") void Promise.all([loadGrooming("dog_grooming"), loadGrooming("cat_grooming")]);
    else if (choice === "dog_grooming" || choice === "cat_grooming") void loadGrooming(choice);
  }, [loadGrooming]);

  const chosenIds = pets.map(p => p.id);
  const eligible = eligibleServicesFor(pets, chosenIds, completedLegs).filter(choice => {
    if (choice === "grooming") return !completedLegs.some(l => ["grooming", "dog_grooming", "cat_grooming"].includes(l.serviceChoice));
    return true;
  });
  const legPets = currentLeg ? pets.filter(p => currentLeg.petIds.includes(p.id)) : [];
  const grooming = currentLeg && ["grooming", "dog_grooming", "cat_grooming"].includes(currentLeg.serviceChoice);

  function chooseService(choice: WalkInServiceChoice) {
    const ids = pets.filter(p => choice === "dog_grooming" ? p.species === "Dog" : choice === "cat_grooming" ? p.species === "Cat" : true).map(p => p.id);
    if (!ids.length) return;
    setWaiverBackStep(step === "add-more" ? "add-more" : "service");
    setCurrentLeg(emptyLeg(choice, ids));
    loadForChoice(choice);
    setStep("waiver");
  }
  function updateSelections(selections: DraftPetSelection[]) {
    setCurrentLeg(prev => prev && { ...prev, petSelections: selections });
  }
  function confirmSchedule(selections?: DraftPetSelection[]) {
    if (!currentLeg) return;
    const confirmedLeg = Array.isArray(selections) ? { ...currentLeg, petSelections: selections } : currentLeg;
    setCompletedLegs(prev => [...prev.filter(l => l.id !== currentLeg.id), confirmedLeg]);
    setCurrentLeg(null);
    setStep("add-more");
  }
  function editLeg(id: string) {
    const found = completedLegs.find(l => l.id === id);
    if (!found) return;
    setCompletedLegs(prev => prev.filter(l => l.id !== id));
    setCurrentLeg(found); loadForChoice(found.serviceChoice); setStep("selection");
  }
  function backFromSelection() { setStep("waiver"); }

  return <div className="ht-pos-booking min-h-screen bg-[#FDF1F7] p-4 sm:p-6 md:p-10">
    <button type="button" onClick={() => router.push("/admin/pos")} className="text-sm font-semibold text-zinc-500 hover:text-brand-pink">← Back to POS</button>
    <div className="mt-6 mx-auto max-w-5xl">
      <div className="mb-5 rounded-2xl border border-pink-100 bg-white px-5 py-4">
        <h1 className="text-xl font-extrabold text-brand-pink">Walk-in Booking</h1>
        <p className="mt-1 text-sm text-zinc-500">Same multi-pet and multi-service booking process as customer appointments, with walk-in records.</p>
        {completedLegs.length > 0 && <p className="mt-2 text-sm font-semibold text-zinc-700">Services ready: {completedLegs.length} · Pets: {pets.length}</p>}
      </div>
      {step !== "verify" && <div className="ht-pos-progress-wrap mb-5 rounded-2xl border border-pink-100 bg-white p-3 sm:p-4"><BookingProgress step={step} hasCompletedServices={completedLegs.length > 0} combinedBoarding={step === "selection" && currentLeg?.serviceChoice === "boarding"} /></div>}
      {lookupError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{lookupError}</p>}
      {step === "verify" && <CustomerVerifyStep onSelectExisting={c => {
        setCustomer(c); setOwner({ name: c.full_name, contact: c.phone_number ?? "", address: c.address ?? "" }); setStep("pet-info");
      }} onNewCustomer={() => { setCustomer(null); setOwner({ name: "", contact: "", address: "" }); setStep("pet-info"); }} />}
      {step === "pet-info" && <PetInformationStep customer={customer} onBack={() => setStep("verify")} onNext={(selected, override) => {
        setPets(selected);
        if (override) setOwner({ name: override.name, contact: override.contact, address: override.address });
        setCompletedLegs([]); setCurrentLeg(null); setStep("service");
      }} />}
      {step === "service" && <CustomerServiceChoiceStep choice={null} petSpecies={pets.map(p => p.species)} onChange={chooseService}
        onBack={() => setStep(completedLegs.length ? "add-more" : "pet-info")} onNext={() => {}} />}
      {step === "waiver" && currentLeg && <WaiverStep serviceType={currentLeg.serviceChoice} onBack={() => { setCurrentLeg(null); setStep(waiverBackStep); }} onAgree={() => setStep("selection")} />}
      {(step === "selection" || step === "schedule") && legPets.length > 1 && <div className="mb-5"><CurrentLegSidebar pets={legPets} onRemove={id => setCurrentLeg(prev => prev && prev.petIds.length > 1 ? { ...prev, petIds: prev.petIds.filter(x => x !== id), petSelections: prev.petSelections.filter(s => s.pet.id !== id) } : prev)} /></div>}
      {step === "selection" && currentLeg?.serviceChoice === "boarding" && <BoardingDetailsAndSchedule
        pets={legPets} selections={currentLeg.petSelections} kennels={kennels}
        alreadyGroomedPetIds={completedLegs.filter(l => ["grooming", "dog_grooming", "cat_grooming"].includes(l.serviceChoice)).flatMap(l => l.petIds)}
        scheduledDate={currentLeg.scheduledDate} petBelongings={currentLeg.petBelongings}
        specialRequests={currentLeg.specialRequests} onChange={updateSelections}
        onBelongingsChange={v => setCurrentLeg(l => l && { ...l, petBelongings: v })}
        onRequestsChange={v => setCurrentLeg(l => l && { ...l, specialRequests: v })}
        onBack={backFromSelection} onConfirmed={confirmSchedule} />}
      {step === "selection" && currentLeg?.serviceChoice === "ala_carte" && <AlaCarteSelectionStep pets={legPets} selections={currentLeg.petSelections} onChange={updateSelections} onBack={backFromSelection} onNext={() => setStep("schedule")} />}
      {step === "selection" && grooming && currentLeg && <CustomerGroomingSelectionStep serviceType={currentLeg.serviceChoice as "grooming" | "dog_grooming" | "cat_grooming"}
        pets={legPets} selections={currentLeg.petSelections} onChange={updateSelections} onBack={backFromSelection} onNext={() => setStep("schedule")} />}
      {step === "schedule" && currentLeg && grooming && <HolidayAwareGroomingSchedule
        petSelections={currentLeg.petSelections} scheduledDate={currentLeg.scheduledDate} scheduledTime={currentLeg.scheduledTime}
        specialRequests={currentLeg.specialRequests}
        onDateChange={v => setCurrentLeg(l => l && { ...l, scheduledDate: v })}
        onTimeChange={v => setCurrentLeg(l => l && { ...l, scheduledTime: v })}
        onRequestsChange={v => setCurrentLeg(l => l && { ...l, specialRequests: v })}
        onSelectionsChange={updateSelections} onBack={() => setStep("selection")}
        onConfirmed={confirmSchedule} />}
      {step === "schedule" && currentLeg && currentLeg.serviceChoice === "ala_carte" && <CustomerGroomingScheduleStep
        customer={customer} ownerContact={owner.contact} petSelections={currentLeg.petSelections} groomers={groomers}
        scheduledDate={currentLeg.scheduledDate} scheduledTime={currentLeg.scheduledTime} specialRequests={currentLeg.specialRequests}
        onDateChange={v => setCurrentLeg(l => l && { ...l, scheduledDate: v })}
        onTimeChange={v => setCurrentLeg(l => l && { ...l, scheduledTime: v })}
        onRequestsChange={v => setCurrentLeg(l => l && { ...l, specialRequests: v })}
        onBack={() => setStep("selection")} onConfirmed={() => confirmSchedule()} />}
      {step === "add-more" && <AddAnotherServicePrompt eligibleServices={eligible} onAddService={chooseService}
        onDone={() => setStep("summary")} onBack={() => { const last = completedLegs[completedLegs.length - 1]; if (last) editLeg(last.id); else setStep("service"); }} />}
      {step === "summary" && <WalkInMultiServiceSummary customer={customer} owner={owner} legs={completedLegs} packagesByService={packagesByService}
        sizesByService={sizesByService} addonsByService={addonsByService} groomers={groomers}
        onBack={() => setStep("add-more")} onEditLeg={editLeg} onDone={() => window.location.assign("/admin/pos")} />}
    </div>
  </div>;
}
