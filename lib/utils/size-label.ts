/** Standard grooming size name for display. Older price rows may say
 * "2 Extra Large", "2XL" or "XXL"; these all show as "2X Extra Large".
 * (Booked price rows can't be renamed in the database, so names are
 * normalised where they are shown.) */
export function canonicalSizeLabel(label: string): string {
  const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (/^(2x?|xx)(extralarge|xl)$/.test(key) || key === "2xl" || key === "xxl") return "2X Extra Large";
  if (key === "xl") return "Extra Large";
  return label.trim();
}
