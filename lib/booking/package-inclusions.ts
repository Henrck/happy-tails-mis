"use client";
// A pet's grooming package inclusions cannot also be booked as add-ons or
// À La Carte items in the same booking (links managed in Service Management).
import { useEffect, useState } from "react";
import type { BookingLeg } from "@/lib/types/booking-leg";
import type { PackageInclusion } from "@/lib/types/services";
import { fetchInclusionLinks, fetchPackageInclusions, type InclusionLink } from "@/lib/supabase/inclusion-links";

/** Same normalization as the database's happytails_inclusion_key(). */
export function inclusionKey(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export type InclusionCoverage = {
  links: InclusionLink[];
  inclusions: PackageInclusion[];
  packageNames: Record<string, string>;
};

export const EMPTY_COVERAGE: InclusionCoverage = { links: [], inclusions: [], packageNames: {} };

/** Add-ons covered by one package: addonId -> the inclusion label that covers it. */
export function coveredAddons(packageId: string | null | undefined, coverage: Pick<InclusionCoverage, "links" | "inclusions">): Map<string, string> {
  const result = new Map<string, string>();
  if (!packageId) return result;
  for (const inc of coverage.inclusions) {
    if (inc.package_id !== packageId) continue;
    const key = inclusionKey(inc.label);
    for (const link of coverage.links) if (link.inclusion_key === key) result.set(link.addon_id, inc.label);
  }
  return result;
}

const isGroomingLeg = (leg: BookingLeg) => ["grooming", "dog_grooming", "cat_grooming"].includes(leg.serviceChoice);

/** Grooming package ids chosen anywhere in the booking. */
export function groomingPackageIds(legs: BookingLeg[]): string[] {
  return Array.from(new Set(legs.filter(isGroomingLeg).flatMap((leg) => leg.petSelections.map((s) => s.packageId)).filter((id): id is string => !!id)));
}

/** For each pet: addonId -> "Package name" whose inclusions cover it. */
export function coveredAddonsByPet(legs: BookingLeg[], coverage: InclusionCoverage): Record<string, Map<string, string>> {
  const result: Record<string, Map<string, string>> = {};
  for (const leg of legs.filter(isGroomingLeg)) {
    for (const sel of leg.petSelections) {
      const map = result[sel.pet.id] ?? new Map<string, string>();
      for (const addonId of coveredAddons(sel.packageId, coverage).keys()) {
        map.set(addonId, coverage.packageNames[sel.packageId ?? ""] ?? "grooming");
      }
      result[sel.pet.id] = map;
    }
  }
  return result;
}

/** Message for the first add-on / À La Carte item already included in the same pet's package, or null. */
export function findIncludedAddonConflict(legs: BookingLeg[], coverage: InclusionCoverage, addonName: (id: string) => string | undefined): string | null {
  const covered = coveredAddonsByPet(legs, coverage);
  for (const leg of legs) {
    for (const sel of leg.petSelections) {
      const map = covered[sel.pet.id];
      if (!map) continue;
      for (const id of sel.addonIds ?? []) {
        const pkg = map.get(id);
        if (pkg) return `“${addonName(id) ?? "This service"}” is already included in ${sel.pet.name}'s ${pkg} grooming package. Remove it before proceeding.`;
      }
    }
  }
  return null;
}

/** Loads links plus inclusions/names for the given packages; reloads when the set changes. */
export function useInclusionCoverage(packageIds: string[]) {
  const key = [...packageIds].sort().join("|");
  const [state, setState] = useState<{ key: string; coverage: InclusionCoverage } | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([fetchInclusionLinks(), fetchPackageInclusions(key ? key.split("|") : [])]).then(([l, p]) => {
      if (active) setState({ key, coverage: { links: l.links, inclusions: p.inclusions, packageNames: p.packageNames } });
    });
    return () => { active = false; };
  }, [key]);
  return { coverage: state?.coverage ?? EMPTY_COVERAGE, loading: state?.key !== key };
}
