import type { ProductBatch } from "@/lib/types/products";

export const EXPIRY_WARNING_DAYS = 30;
export type BatchHealth = "adjustment" | "depleted" | "expired" | "expiring" | "healthy" | "unknown";

// Date-only values are compared as dates in the Philippine store's timezone.
// Parsing YYYY-MM-DD as a UTC timestamp would produce incorrect boundary days.
export function philippinesToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (name: string) => parts.find(p => p.type === name)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function expiryDaysLeft(expiry: string | null, today = philippinesToday()): number | null {
  if (!expiry) return null;
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${expiry}T00:00:00Z`);
  return Number.isFinite(end) ? Math.round((end - start) / 86400000) : null;
}

export function batchHealth(batch: ProductBatch, today = philippinesToday()): BatchHealth {
  if (batch.is_adjustment) return "adjustment";
  if (batch.quantity <= 0) return "depleted";
  const days = expiryDaysLeft(batch.expiration_date, today);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "healthy";
}

export function batchHealthLabel(health: BatchHealth): string {
  return ({ adjustment: "Legacy adjustment", depleted: "Depleted", expired: "Expired — Not for sale", expiring: "Expiring Soon", healthy: "Good", unknown: "No expiry recorded" } as const)[health];
}

export function sellableStock(productId: string, batches: ProductBatch[], today = philippinesToday()): number {
  // Existing negative adjustment rows must keep reducing sellable inventory.
  // Any legacy positive adjustment rows remain included for compatibility.
  const sum = batches.filter(b => b.product_id === productId).reduce((n, b) => {
    if (!b.is_adjustment && b.expiration_date && b.expiration_date < today) return n;
    return n + Number(b.quantity || 0);
  }, 0);
  return Math.max(0, sum);
}

export function physicalStock(productId: string, batches: ProductBatch[]): number {
  return Math.max(0, batches.filter(b => b.product_id === productId).reduce((n, b) => n + Number(b.quantity || 0), 0));
}
