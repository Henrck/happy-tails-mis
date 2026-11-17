// Links between grooming package inclusions (by name) and add-on / À La Carte
// items that are the same service. See 20261117_10_inclusion_addon_links.sql.
import { createClient } from "./client";
import type { PackageInclusion } from "@/lib/types/services";

export type InclusionLink = { inclusion_key: string; addon_id: string };

export async function fetchInclusionLinks() {
  const { data, error } = await createClient().from("package_inclusion_addon_links").select("inclusion_key,addon_id");
  return { links: (data ?? []) as InclusionLink[], error: error?.message ?? null };
}

/** Inclusions and names for specific packages (e.g. those chosen in a booking). */
export async function fetchPackageInclusions(packageIds: string[]) {
  if (!packageIds.length) return { inclusions: [] as PackageInclusion[], packageNames: {} as Record<string, string>, error: null };
  const db = createClient();
  const [inc, pk] = await Promise.all([
    db.from("package_inclusions").select("*").in("package_id", packageIds),
    db.from("packages").select("id,name").in("id", packageIds),
  ]);
  return {
    inclusions: (inc.data ?? []) as PackageInclusion[],
    packageNames: Object.fromEntries((pk.data ?? []).map((p) => [p.id as string, p.name as string])),
    error: inc.error?.message ?? pk.error?.message ?? null,
  };
}

/** Super Admin: replace the linked add-ons for one inclusion name. */
export async function setInclusionLinks(inclusionLabel: string, addonIds: string[]) {
  const { error } = await createClient().rpc("happytails_set_inclusion_addon_links", { p_inclusion_label: inclusionLabel, p_addon_ids: addonIds });
  return { error: error?.message ?? null };
}
