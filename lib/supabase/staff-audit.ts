import { createClient } from "@/lib/supabase/client";
export type StaffAuditEntry = {
  id: number; occurred_at: string; actor_id: string | null;
  actor_name: string; actor_role: string; module: string;
  action: string; severity: "info" | "high" | "critical";
  entity_table: string; entity_id: string | null;
  before_data: Record<string, unknown>; after_data: Record<string, unknown>;
  changed_fields: string[]; origin: string;
};
export type AuditFilters = {
  search: string; module: string; severity: string;
  fromDate: string; toDate: string;
};
const PAGE_SIZE = 25;
export async function fetchStaffAuditPage(filters: AuditFilters, page: number) {
  const db = createClient();
  let query = db.from("staff_audit_logs").select("*", { count: "exact" });
  if (filters.module !== "all") query = query.eq("module", filters.module);
  if (filters.severity !== "all") query = query.eq("severity", filters.severity);
  if (filters.fromDate) query = query.gte("occurred_at", `${filters.fromDate}T00:00:00+08:00`);
  if (filters.toDate) query = query.lte("occurred_at", `${filters.toDate}T23:59:59.999+08:00`);
  const search = filters.search.trim();
  // Supabase "or" syntax uses a mini-language. Escape wildcard/structural
  // characters so a typed search cannot alter the filter expression.
  if (search) {
    const term = search.replace(/[,%().*\\]/g, "").slice(0, 75);
    if (term) {
      const numericId = /^\d+$/.test(term) && Number.isSafeInteger(Number(term)) && Number(term) > 0 ? Number(term) : null;
      query = query.or(`${numericId !== null ? `id.eq.${numericId},` : ""}actor_name.ilike.%${term}%,action.ilike.%${term}%,entity_id.ilike.%${term}%`);
    }
  }
  const { data, error, count } = await query.order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  return { rows: (data ?? []) as StaffAuditEntry[], count: count ?? 0,
    error: error?.message ?? null, pageSize: PAGE_SIZE };
}
