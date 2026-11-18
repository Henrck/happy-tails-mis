/** Units a product can be sold in (Inventory and POS forms). */
export const PRODUCT_UNITS = ["Piece", "Pack", "Box", "Bottle", "Can", "Pouch", "Kilo", "Grams", "Liters", "ml"] as const;

/** Unit plus pack size for display, e.g. "Pouch · 80g"; just the unit when there is no size. */
export function productUnitLabel(product: { unit: string; package_size?: string | null }): string {
  const unit = product.unit?.trim();
  const size = product.package_size?.trim();
  if (unit && size && size.toLowerCase() !== unit.toLowerCase()) return `${unit} · ${size}`;
  return unit || size || "";
}
