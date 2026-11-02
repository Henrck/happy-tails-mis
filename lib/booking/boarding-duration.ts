import type { DraftPetSelection } from "@/lib/types/appointments";
import type { PackagePricing } from "@/lib/types/services";

export const MIN_EXTENDED_BOARDING_NIGHTS = 7;
export const MAX_BOARDING_NIGHTS = 365;

/** A fixed "7 Days & 6 Nights" package must NOT be mistaken for "7 Days & Up". */
export function isExtendedBoardingRate(rate: PackagePricing): boolean {
  if (rate.is_per_night) return true;
  return /(?:7\s*(?:days?|nights?)\s*(?:&\s*)?(?:and\s*)?(?:up|above)|7\s*\+\s*(?:days?|nights?))/i
    .test(`${rate.size_label} ${rate.size_detail ?? ""}`);
}

export function parseExtendedBoardingNights(value: string | number | null | undefined): number | null {
  const raw = value == null ? "" : String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  const nights = Number(raw);
  return Number.isSafeInteger(nights) && nights >= MIN_EXTENDED_BOARDING_NIGHTS && nights <= MAX_BOARDING_NIGHTS ? nights : null;
}

export function extendedBoardingNightError(value: string | number | null | undefined): string | null {
  const raw = value == null ? "" : String(value).trim();
  if (!raw) return `Enter the number of nights. The minimum is ${MIN_EXTENDED_BOARDING_NIGHTS}.`;
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return `Enter a valid whole number of nights (at least ${MIN_EXTENDED_BOARDING_NIGHTS}).`;
  }
  const number = Number(raw);
  if (number < MIN_EXTENDED_BOARDING_NIGHTS) return `${MIN_EXTENDED_BOARDING_NIGHTS} nights is the starting minimum for 7 Days & Up.`;
  if (number > MAX_BOARDING_NIGHTS) return `The maximum supported stay is ${MAX_BOARDING_NIGHTS} nights.`;
  return null;
}

export function hasValidBoardingDuration(selection: DraftPetSelection, pricing: PackagePricing[]): boolean {
  const rate = pricing.find((r) => r.id === selection.packagePricingId);
  if (!rate) return false;
  if (isExtendedBoardingRate(rate)) return parseExtendedBoardingNights(selection.boardingNights) !== null;
  const match = `${rate.size_detail ?? ""} ${rate.size_label}`.match(/(\d+)\s*nights?/i);
  const nights = rate.nights ?? selection.boardingNights ?? (match ? Number(match[1]) : null);
  return typeof nights === "number" && Number.isSafeInteger(nights) && nights >= 1 && nights <= MAX_BOARDING_NIGHTS;
}
