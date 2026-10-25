import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing } from "@/lib/types/services";

/** A single minimum for the shared Customer and POS "7 Days & Up" option. */
export const MIN_EXTENDED_BOARDING_NIGHTS = 7;
export const MAX_BOARDING_NIGHTS = 365;

export function isExtendedBoardingRate(rate: PackagePricing): boolean {
  return rate.is_per_night || /7\s*(?:days|nights)|week/i.test(`${rate.size_label} ${rate.size_detail ?? ""}`);
}

/** Invalid, fractional, negative, or unsafe quantities must never be priced or scheduled. */
export function parseExtendedBoardingNights(value: string | number | null | undefined): number | null {
  const text = value == null ? "" : String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const nights = Number(text);
  return Number.isSafeInteger(nights) && nights >= MIN_EXTENDED_BOARDING_NIGHTS && nights <= MAX_BOARDING_NIGHTS ? nights : null;
}

export function extendedBoardingNightError(value: string | number | null | undefined): string | null {
  const text = value == null ? "" : String(value).trim();
  if (!text) return `Enter the number of nights. The minimum is ${MIN_EXTENDED_BOARDING_NIGHTS}.`;
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) {
    return `Enter a valid whole number of nights (at least ${MIN_EXTENDED_BOARDING_NIGHTS}).`;
  }
  if (Number(text) < MIN_EXTENDED_BOARDING_NIGHTS) {
    return `${MIN_EXTENDED_BOARDING_NIGHTS} nights is the starting minimum for 7 Days & Up. Please enter ${MIN_EXTENDED_BOARDING_NIGHTS} or more.`;
  }
  if (Number(text) > MAX_BOARDING_NIGHTS) {
    return `The maximum supported boarding stay is ${MAX_BOARDING_NIGHTS} nights. Contact HappyTails for longer stays.`;
  }
  return null;
}

/** Protects scheduling if a stale/invalid selection bypasses the duration screen. */
export function hasValidBoardingDuration(selection: DraftPetSelection, pricing: PackagePricing[]): boolean {
  const rate = pricing.find((row) => row.id === selection.packagePricingId);
  if (!rate) return false;
  if (isExtendedBoardingRate(rate)) {
    return parseExtendedBoardingNights(selection.boardingNights) !== null;
  }
  const parsed = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  const nights = rate.nights ?? selection.boardingNights ?? (parsed ? Number(parsed[1]) : null);
  return typeof nights === "number" && Number.isSafeInteger(nights) && nights > 0 && nights <= MAX_BOARDING_NIGHTS;
}
