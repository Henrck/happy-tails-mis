import { createClient } from "./client";
import type { Groomer, Kennel, KennelSize } from "@/lib/types/pet-services";

export async function fetchGroomers(options?: { activeOnly?: boolean }) {
  const supabase = createClient();
  let query = supabase.from("groomers").select("*").order("name");
  if (options?.activeOnly) query = query.eq("status", "active");
  const { data, error } = await query;
  return { groomers: (data ?? []) as Groomer[], error: error?.message };
}
export async function addGroomer(name: string) {
  return createClient().from("groomers").insert({ name }).select().single();
}
export async function setGroomerStatus(id: string, status: "active" | "archived") {
  return createClient().from("groomers").update({ status }).eq("id", id);
}

/** Normal booking screens only see active capacity. Staff management sees both. */
export async function fetchKennels(options?: { includeInactive?: boolean }) {
  let query = createClient().from("kennels").select("*").order("size").order("number");
  if (!options?.includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  return { kennels: (data ?? []) as Kennel[], error: error?.message };
}
export async function addKennel(size: KennelSize, number: number) {
  return createClient().from("kennels").insert({ size, number, is_active: true }).select().single();
}
/** The database checks permissions and prevents disabling reserved kennels. */
export async function setKennelActive(id: string, active: boolean) {
  const { error } = await createClient().rpc("happytails_set_kennel_active", {
    p_kennel_id: id, p_active: active,
  });
  return { error };
}
/** Legacy call now soft-disables rather than deleting kennel history. */
export async function removeKennel(id: string) { return setKennelActive(id, false); }
