import type { BookingLeg } from "@/lib/types/booking-leg";
import type { Addon } from "@/lib/types/services";

/** Match equivalent catalog entries from Grooming, Boarding and À La Carte.
 * IDs differ across categories; only the same pet in the same booking is restricted.
 */
export function normalizeAddonName(name: string): string {
  return name.toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/\bplus\b|\+/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\band\b/g, " ")
    .replace(/\btrimming\b/g, "trim")
    .replace(/\bcleaning\b/g, "clean")
    .replace(/\bbrushing\b/g, "brush")
    .replace(/\bteeth\b/g, "tooth")
    .replace(/\bhair cut\b/g, "haircut")
    .replace(/\s+/g, " ").trim();
}

export type AddonCatalogs = Record<string, Pick<Addon, "id" | "name">[]>;

function catalogFor(leg: BookingLeg, petSpecies: string, catalogs: AddonCatalogs) {
  if (leg.serviceChoice === "grooming") return catalogs[petSpecies === "Cat" ? "cat_grooming" : "dog_grooming"] ?? [];
  return catalogs[leg.serviceChoice] ?? [];
}

export function chosenAddonNamesByPet(legs: BookingLeg[], catalogs: AddonCatalogs): Record<string, Set<string>> {
  const result: Record<string, Set<string>> = {};
  for (const leg of legs) {
    for (const selected of leg.petSelections) {
      const names = catalogFor(leg, selected.pet.species, catalogs);
      const chosen = result[selected.pet.id] ?? new Set<string>();
      for (const id of selected.addonIds ?? []) {
        const name = names.find(item => item.id === id)?.name;
        if (name) chosen.add(normalizeAddonName(name));
      }
      result[selected.pet.id] = chosen;
    }
  }
  return result;
}

export function findDuplicatePetAddon(legs: BookingLeg[], catalogs: AddonCatalogs): string | null {
  const known = new Map<string, Set<string>>();
  for (const leg of legs) {
    for (const selection of leg.petSelections) {
      const petId = selection.pet.id;
      const names = catalogFor(leg, selection.pet.species, catalogs);
      const seen = known.get(petId) ?? new Set<string>();
      for (const id of selection.addonIds ?? []) {
        const item = names.find(a => a.id === id);
        if (!item) continue;
        const key = normalizeAddonName(item.name);
        if (seen.has(key)) return `${selection.pet.name} already has “${item.name}” selected in another service. Remove it from one service before proceeding.`;
        seen.add(key);
      }
      known.set(petId, seen);
    }
  }
  return null;
}
