/** One canonical definition for booking and walk-in boarding promotions. */
export const BATH_DRY_FREE_NIGHTS = 4;
export function hasFreeBathDry(nights: number | null | undefined): boolean {
  return Number.isInteger(nights) && (nights ?? 0) >= BATH_DRY_FREE_NIGHTS;
}
export function isBathDry(name: string): boolean { return /bath\s*(?:&|and|\+)\s*(?:blow\s*)?dry/i.test(name) || /bath\s*(?:&|and|\+)\s*blow/i.test(name); }
export function isFullGrooming(name: string): boolean { return /full\s*(?:pet\s*)?groom/i.test(name); }
/** Boarding Bath & Dry rates are per pet, regardless of dog/cat species.
 * Small and Medium use the Small rate; Large and larger use the Large rate. */
export function boardingBathDryPrice(sizeLabel: string | null | undefined): number {
  const size = (sizeLabel ?? "").trim().toLowerCase();
  return size === "small" || size === "medium" ? 500 : 600;
}
export function blockingReason(name: string, nights: number | null | undefined, hasGroomingPackage: boolean): string | null {
  if (hasFreeBathDry(nights) && isBathDry(name)) return "Free Bath & Dry is already included for boarding of 4 or more nights.";
  if (hasGroomingPackage && isFullGrooming(name)) return "This pet already has a grooming package in the booking.";
  return null;
}
/** XL and 2XL must never fall back to a Small–Medium add-on rate. */
export function groomingAddonPrice<T extends {size_label:string;price:number}>(rows: T[], sizeLabel?: string | null): T | undefined {
  const normalize = (s:string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const size = normalize(sizeLabel ?? "");
  const tier = /^(?:2xl|xxl|extraextralarge|2extralarge|xl|extralarge|large|l)$/.test(size) ? "large" : "smallmedium";
  const mapped = rows.find(row => { const s=normalize(row.size_label);return tier === "large" ? s === "large" || s === "largesize" : s === "smallmedium" || s === "small"; });
  if (tier === "large") return mapped;
  const matching = rows.find(row => normalize(row.size_label) === size);
  return matching ?? mapped ?? (rows.length === 1 && /standard|allsize|fixed/i.test(rows[0].size_label) ? rows[0] : undefined);
}
