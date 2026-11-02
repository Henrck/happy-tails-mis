import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing } from "@/lib/types/services";
import { isExtendedBoardingRate } from "@/lib/booking/boarding-duration";

export type ShareSelection = DraftPetSelection & { boardingShareGroupId?: string | null };
export const tier = (size: string): "small" | "medium" | "large" | null => {
  const s = size.trim().toLowerCase();
  if (s === "small" || s === "medium") return s;
  return /large|^(?:[2-9]xl|x{1,5}l)$/.test(s) ? "large" : null;
};
export function validShareGroup(selections: ShareSelection[]): boolean {
  if (![2, 3].includes(selections.length)) return false;
  const values = selections.map(s => tier(s.pet.size_label)).sort();
  const combo = values.join("+");
  if (!(["medium+small", "medium+medium", "small+small+small"].includes(combo))) return false;
  const first = selections[0];
  return selections.every(s => s.boardingKennelSize === "big" && s.packageId === first.packageId &&
    !!s.packagePricingId && s.packagePricingId === first.packagePricingId &&
    s.boardingNights === first.boardingNights && s.pet.id !== "");
}
export function shareGroups(selections: ShareSelection[]): ShareSelection[][] {
  const groups = new Map<string, ShareSelection[]>();
  for (const sel of selections) if (sel.boardingShareGroupId) {
    groups.set(sel.boardingShareGroupId, [...(groups.get(sel.boardingShareGroupId) ?? []), sel]);
  }
  return [...groups.values()];
}
export function shareError(selections: ShareSelection[]): string | null {
  for (const group of shareGroups(selections)) {
    if (!validShareGroup(group)) return "Shared Big kennels require Small + Medium, Medium + Medium, or 3 Small pets, with the same package and nights.";
  }
  return null;
}
export function baseBoardingCharge(selection: ShareSelection, prices: PackagePricing[]): number {
  const rate = prices.find(p => p.id === selection.packagePricingId && p.package_id === selection.packageId);
  if (!rate) return 0;
  return rate.price * (isExtendedBoardingRate(rate) ? selection.boardingNights ?? 0 : 1);
}
/** Pass complete, independently priced selections; removes only duplicate kennel BASE charges. */
export function withSharedKennelPrices(selections: ShareSelection[], prices: PackagePricing[]): ShareSelection[] {
  if (shareError(selections)) return selections;
  const groups = shareGroups(selections);
  const nonPayers = new Set(groups.flatMap(group => group.slice(1).map(s => s.pet.id)));
  return selections.map(s => nonPayers.has(s.pet.id)
    ? { ...s, lineAmount: Math.max(0, Math.round((s.lineAmount - baseBoardingCharge(s, prices)) * 100) / 100) }
    : s);
}
