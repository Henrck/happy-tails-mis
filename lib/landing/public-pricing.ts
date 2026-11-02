import type { Package, PackageInclusion, PackagePricing, PetSize } from "@/lib/types/services";
import type { PriceTier } from "@/components/landing/PricingCard";

/** Public cards use exactly the active packages/rates configured in Service Management. */
export type PublicPricingCatalog = {
  packages: Package[];
  pricing: PackagePricing[];
  sizes: PetSize[];
  inclusions: PackageInclusion[];
  /** False if the database query failed; never fall back to obsolete price constants. */
  loaded: boolean;
};

const money = new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export function pesos(value: number): string {
  return `₱${money.format(value)}`;
}

function validRate(rate: PackagePricing): boolean {
  return Number.isFinite(Number(rate.price)) && Number(rate.price) >= 0;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function activePackages(catalog: PublicPricingCatalog, service: Package["service_type"]): Package[] {
  return catalog.packages.filter(p => p.service_type === service && p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function packageInclusions(catalog: PublicPricingCatalog, packageId: string): string[] {
  return catalog.inclusions.filter(i => i.package_id === packageId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(i => i.label.trim()).filter(Boolean);
}

/** Prefer a referenced size row, then fall back to the legacy size label. */
export function groomingTiers(catalog: PublicPricingCatalog, packageId: string): PriceTier[] {
  const rows = catalog.pricing.filter(rate => rate.package_id === packageId && validRate(rate));
  const indexed = rows.flatMap(rate => {
    const size = catalog.sizes.find(s =>
      (rate.size_id != null && rate.size_id === s.id) ||
      (rate.size_id == null && normalize(s.label) === normalize(rate.size_label)));
    // Deactivated size rows are not advertised for new appointments.
    if (size && !size.is_active) return [];
    const name = size?.label || rate.size_label;
    const weight = size?.weight_range?.trim();
    return [{ rank: size?.sort_order ?? 999, label: weight ? `${name} (${weight})` : name,
      price: pesos(Number(rate.price)), id: rate.id }];
  });
  return indexed.sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map(({ label, price }) => ({ label, price }));
}

function boardingNights(rate: PackagePricing): number | null {
  if (rate.is_per_night) return null;
  if (Number.isInteger(rate.nights) && Number(rate.nights) > 0) return Number(rate.nights);
  const text = `${rate.size_label} ${rate.size_detail ?? ""}`;
  const nights = text.match(/(\d+)\s*nights?/i);
  if (nights) return Number(nights[1]);
  const days = text.match(/(\d+)\s*days?/i);
  return days ? Number(days[1]) - 1 : null;
}

export function boardingTiers(catalog: PublicPricingCatalog, packageIds: string[]): PriceTier[] {
  const idSet = new Set(packageIds);
  return catalog.pricing.filter(rate => idSet.has(rate.package_id) && validRate(rate))
    .map(rate => {
      const nights = boardingNights(rate);
      const label = rate.is_per_night
        ? `${rate.size_label.trim() || "7 Days & Up"} · Per night`
        : nights != null && nights > 0
          ? `${nights + 1} ${nights + 1 === 1 ? "Day" : "Days"} & ${nights} ${nights === 1 ? "Night" : "Nights"}`
          : (rate.size_detail?.trim() || rate.size_label.trim() || "Boarding rate");
      return { nights: rate.is_per_night ? Number.POSITIVE_INFINITY : nights ?? 999,
        label, price: pesos(Number(rate.price)), id: rate.id };
    }).sort((a, b) => a.nights - b.nights || a.label.localeCompare(b.label) || a.id.localeCompare(b.id))
    .map(({ label, price }) => ({ label, price }));
}

/** Kennel type is currently encoded in the package name by the booking allocator. */
export function kennelPackageSize(name: string): "small" | "big" | null {
  const small = /(^|[^a-z])small([^a-z]|$)/i.test(name);
  const big = /(^|[^a-z])(big|large)([^a-z]|$)/i.test(name);
  return small === big ? null : small ? "small" : "big";
}
