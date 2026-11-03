import type { Pet } from "@/lib/types/appointments";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { WalkInServiceChoice } from "@/components/admin/pos/walk-in/ServiceChoiceStep";
import type { BookingPhase } from "@/components/dashboard/booking/BookingProgress";

export type CustomerBookingDraft = {
  step: BookingPhase;
  draftServiceChoice: WalkInServiceChoice | null;
  waiverBackStep: "service" | "add-more";
  selectedPetIds: string[];
  queuedLegs: BookingLeg[];
  completedLegs: BookingLeg[];
  currentLeg: BookingLeg | null;
};

const VERSION = 1;
const LIFETIME_MS = 24 * 60 * 60 * 1000;
const STEPS: BookingPhase[] = ["pet-info", "service", "waiver", "selection", "schedule", "add-more", "summary"];

function key(customerId: string): string {
  return `happytails:customer-booking-draft:v${VERSION}:${customerId}`;
}

export function clearCustomerBookingDraft(customerId: string): void {
  try { window.sessionStorage.removeItem(key(customerId)); } catch { /* unavailable storage */ }
}

export function saveCustomerBookingDraft(customerId: string, draft: CustomerBookingDraft): void {
  try { window.sessionStorage.setItem(key(customerId), JSON.stringify({ version: VERSION, savedAt: Date.now(), draft })); }
  catch { /* private mode or storage quota: booking still works in memory */ }
}

function restoreLeg(value: unknown, pets: Pet[]): BookingLeg | null {
  if (!value || typeof value !== "object") return null;
  const leg = value as Partial<BookingLeg>;
  if (typeof leg.id !== "string" || typeof leg.serviceChoice !== "string" || !Array.isArray(leg.petIds) || !Array.isArray(leg.petSelections)) return null;
  if (!["grooming", "dog_grooming", "cat_grooming", "boarding", "ala_carte"].includes(leg.serviceChoice)) return null;
  const petById = new Map(pets.map(p => [p.id, p]));
  const petIds = leg.petIds.filter((id): id is string => typeof id === "string" && petById.has(id));
  if (!petIds.length) return null;
  const petSelections = leg.petSelections.filter(s => s && typeof s === "object" && s.pet && typeof s.pet.id === "string" && petIds.includes(s.pet.id))
    .map(s => ({ ...s, pet: petById.get(s.pet.id)! }));
  return {
    ...leg,
    id: leg.id,
    serviceChoice: leg.serviceChoice as BookingLeg["serviceChoice"],
    petIds,
    petSelections,
    scheduledDate: typeof leg.scheduledDate === "string" ? leg.scheduledDate : null,
    scheduledTime: typeof leg.scheduledTime === "string" ? leg.scheduledTime : null,
    dropOffAt: typeof leg.dropOffAt === "string" ? leg.dropOffAt : null,
    pickUpAt: typeof leg.pickUpAt === "string" ? leg.pickUpAt : null,
    petBelongings: Array.isArray(leg.petBelongings) ? leg.petBelongings.filter((v): v is string => typeof v === "string") : [],
    specialRequests: typeof leg.specialRequests === "string" ? leg.specialRequests : "",
  };
}

export function readCustomerBookingDraft(customerId: string, pets: Pet[]): CustomerBookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key(customerId));
    if (!raw) return null;
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== "object") { clearCustomerBookingDraft(customerId); return null; }
    const entry = stored as { version?: unknown; savedAt?: unknown; draft?: unknown };
    if (entry.version !== VERSION || typeof entry.savedAt !== "number" || !Number.isFinite(entry.savedAt) ||
      entry.savedAt > Date.now() || Date.now() - entry.savedAt > LIFETIME_MS || !entry.draft || typeof entry.draft !== "object") {
      clearCustomerBookingDraft(customerId); return null;
    }
    const d = entry.draft as Partial<CustomerBookingDraft>;
    const selectedPetIds = Array.isArray(d.selectedPetIds)
      ? d.selectedPetIds.filter((id): id is string => typeof id === "string" && pets.some(p => p.id === id)) : [];
    const queuedLegs = Array.isArray(d.queuedLegs) ? d.queuedLegs.map(l => restoreLeg(l, pets)).filter((l): l is BookingLeg => !!l) : [];
    const completedLegs = Array.isArray(d.completedLegs) ? d.completedLegs.map(l => restoreLeg(l, pets)).filter((l): l is BookingLeg => !!l && l.petSelections.length > 0) : [];
    const currentLeg = restoreLeg(d.currentLeg, pets);
    let step: BookingPhase = STEPS.includes(d.step as BookingPhase) ? d.step as BookingPhase : "pet-info";
    if (selectedPetIds.length === 0) step = "pet-info";
    if (["waiver", "selection", "schedule"].includes(step) && !currentLeg) step = "service";
    if (step === "schedule" && !currentLeg?.petSelections.length) step = "selection";
    if (["add-more", "summary"].includes(step) && !completedLegs.length) step = "service";
    return {
      step,
      draftServiceChoice: typeof d.draftServiceChoice === "string" && ["grooming", "dog_grooming", "cat_grooming", "boarding", "ala_carte"].includes(d.draftServiceChoice) ? d.draftServiceChoice as WalkInServiceChoice : null,
      waiverBackStep: d.waiverBackStep === "add-more" ? "add-more" : "service",
      selectedPetIds,
      queuedLegs,
      completedLegs,
      currentLeg,
    };
  } catch {
    clearCustomerBookingDraft(customerId);
    return null;
  }
}
