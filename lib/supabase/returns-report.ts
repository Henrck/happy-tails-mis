// Returns report: one row per return (RET-…), with its items, reason and the
// staff member who processed it. Reads the tables from the POS returns migration.
import { createClient } from "./client";
import type { ReturnReasonLabel, ReturnReportRow } from "@/lib/types/reports";

type RawReturn = {
  id: string;
  return_number: string;
  reason: string;
  note: string | null;
  late_override: boolean;
  created_by: string;
  created_at: string;
  sales: { invoice_number: string; sold_at: string } | null;
  sale_return_items: { quantity: number; unit_price: number; products: { name: string; category: string } | null }[] | null;
};

const REASON: Record<string, ReturnReasonLabel> = { damaged: "Damaged", expired: "Expired", other: "Other" };
/** YYYY-MM-DD in Philippine time, so date filters match the shop's day. */
const manilaDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const manilaLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

export async function fetchReturnReportRows(): Promise<{ rows: ReturnReportRow[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sale_returns")
    .select(`id, return_number, reason, note, late_override, created_by, created_at,
      sales(invoice_number, sold_at),
      sale_return_items(quantity, unit_price, products(name, category))`)
    .order("created_at", { ascending: false });
  if (error) {
    // Before the returns migration is run the table does not exist yet.
    if (/sale_returns/.test(error.message) && /(does not exist|schema cache|not find)/i.test(error.message)) return { rows: [], error: null };
    return { rows: [], error: error.message };
  }
  const raw = (data ?? []) as unknown as RawReturn[];

  // Staff names: try staff profiles first, then the general profiles table.
  const ids = [...new Set(raw.map((r) => r.created_by))];
  const names = new Map<string, string>();
  if (ids.length) {
    const [{ data: staff }, { data: profiles }] = await Promise.all([
      supabase.from("staff_profiles").select("id, first_name, last_name").in("id", ids),
      supabase.from("profiles").select("id, full_name").in("id", ids),
    ]);
    for (const p of profiles ?? []) if (p.full_name) names.set(p.id, p.full_name);
    for (const s of staff ?? []) names.set(s.id, [s.first_name, s.last_name].filter(Boolean).join(" "));
  }

  const rows: ReturnReportRow[] = raw.map((r) => {
    const items = (r.sale_return_items ?? []).map((item) => ({
      name: item.products?.name ?? "Unknown product",
      category: item.products?.category ?? "Unknown",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
    }));
    return {
      id: r.id,
      returnNumber: r.return_number,
      invoiceNumber: r.sales?.invoice_number ?? "—",
      items,
      itemName: items.map((item) => `${item.name} ×${item.quantity}`).join(", ") || "—",
      units: items.reduce((sum, item) => sum + item.quantity, 0),
      value: Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) * 100) / 100,
      reason: REASON[r.reason] ?? "Other",
      note: r.note,
      lateOverride: r.late_override,
      staff: names.get(r.created_by) || "Staff",
      purchaseDate: r.sales?.sold_at ? manilaLabel(r.sales.sold_at) : "—",
      date: manilaDay(r.created_at),
      displayDate: manilaLabel(r.created_at),
      createdAt: r.created_at,
    };
  });
  return { rows, error: null };
}
