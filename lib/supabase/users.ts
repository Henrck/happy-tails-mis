// Query + mutation helpers for User Account Management. Status changes
// (active/inactive/archive/restore) go straight through the client —
// RLS already restricts writes to superadmin, so there's no need for a
// server route for these. Only actions touching auth.users itself
// (delete, password reset) need the service-role API routes.
import { createClient } from "./client";
import type { StaffMember, Customer, AccountStatus } from "@/lib/types/users";

export async function fetchStaff() {
  const supabase = createClient();
  const { data, error } = await supabase.from("staff_profiles").select("*").order("created_at", { ascending: false });
  return { staff: (data ?? []) as StaffMember[], error: error?.message };
}

export async function fetchCustomers() {
  const supabase = createClient();
  const { data, error } = await supabase.from("customers").select("*").order("registered_at", { ascending: false });
  return { customers: (data ?? []) as Customer[], error: error?.message };
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
  await supabase.from("audit_logs").insert({
    actor_id: user.id,
    actor_role: profile?.role,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
}
