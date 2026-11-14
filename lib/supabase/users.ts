// Query + mutation helpers for User Account Management.
import { createClient } from "./client";
import type { StaffMember, Customer, AccountStatus } from "@/lib/types/users";

export async function fetchStaff() {
  const supabase = createClient();
  const { data, error } = await supabase.from("staff_profiles").select("*").order("created_at", { ascending: false });
  return { staff: (data ?? []) as StaffMember[], error: error?.message };
}

export async function fetchCustomers() {
  const supabase = createClient();
  const [{ data, error }, { data: penalties, error: penaltyError }] = await Promise.all([
    supabase.from("customers").select("*").order("registered_at", { ascending: false }),
    supabase.from("customer_booking_penalties").select("customer_id,penalty_count,penalty_restricted_until,manual_restricted,manual_restricted_until,manual_restriction_reason"),
  ]);
  const byCustomer = new Map((penalties ?? []).map((row) => [row.customer_id, row]));
  const now = Date.now();
  const customers = (data ?? []).map((customer) => {
    const penalty = byCustomer.get(customer.id);
    const penaltyActive = !!penalty?.penalty_restricted_until && new Date(penalty.penalty_restricted_until).getTime() > now;
    const manualActive = !!penalty?.manual_restricted && (!penalty.manual_restricted_until || new Date(penalty.manual_restricted_until).getTime() > now);
    const activeDates = [penaltyActive ? penalty?.penalty_restricted_until : null, manualActive ? penalty?.manual_restricted_until : null].filter((value): value is string => Boolean(value));
    const bookingRestrictedUntil = manualActive && !penalty?.manual_restricted_until ? null : activeDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
    return {
      ...customer,
      penalty_count: penalty?.penalty_count ?? 0,
      penalty_restricted_until: penalty?.penalty_restricted_until ?? null,
      manual_restricted: penalty?.manual_restricted ?? false,
      manual_restricted_until: penalty?.manual_restricted_until ?? null,
      manual_restriction_reason: penalty?.manual_restriction_reason ?? null,
      is_booking_restricted: penaltyActive || manualActive,
      booking_restricted_until: bookingRestrictedUntil,
    } as Customer;
  });
  return { customers, error: error?.message ?? penaltyError?.message };
}

export async function setStaffStatus(id: string, status: AccountStatus) {
  const supabase = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "archived") patch.archived_at = new Date().toISOString();
  if (status === "active") patch.archived_at = null;
  return supabase.from("staff_profiles").update(patch).eq("id", id);
}

export async function setCustomerStatus(id: string, status: AccountStatus) {
  const supabase = createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "archived") patch.archived_at = new Date().toISOString();
  if (status === "active") patch.archived_at = null;
  return supabase.from("customers").update(patch).eq("id", id);
}

export async function logAudit(action: string, targetType: "staff" | "customer", targetId: string, details?: Record<string, unknown>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  await supabase.from("audit_logs").insert({ actor_id: user.id, actor_role: profile?.role, action, target_type: targetType, target_id: targetId, details });
}
