import { createClient } from "./client";
import type { Groomer, Kennel, KennelSize } from "@/lib/types/pet-services";
export async function fetchGroomers(options?: { activeOnly?: boolean }) {
  let q = createClient().from("groomers").select("*").order("name");
  if (options?.activeOnly) q = q.eq("status", "active");
  const { data, error } = await q;
  return { groomers: (data ?? []) as Groomer[], error: error?.message };
}
export async function addGroomer(name: string) { return createClient().from("groomers").insert({ name }).select().single(); }
export async function setGroomerStatus(id: string, status: "active" | "archived") { return createClient().from("groomers").update({ status }).eq("id", id); }
export async function fetchKennels(options?: { includeInactive?: boolean }) {
  let q = createClient().from("kennels").select("*").order("size").order("number");
  if (!options?.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  return { kennels: (data ?? []) as Kennel[], error: error?.message };
}
export async function addKennel(size: KennelSize, number: number, name?: string) {
  return createClient().from("kennels").insert({ size, number, is_active: true, name: name?.trim() || `Kennel ${number}` }).select().single();
}
export async function renameKennel(id: string, name: string) {
  const value = name.trim();
  if (!value || value.length > 60) return { error: { message: "Kennel name must be between 1 and 60 characters." } };
  const { error } = await createClient().from("kennels").update({ name: value }).eq("id", id);
  return { error };
}
export async function setKennelActive(id: string, active: boolean) {
  const { error } = await createClient().rpc("happytails_set_kennel_active", { p_kennel_id: id, p_active: active });
  return { error };
}
export async function removeKennel(id: string) { return setKennelActive(id, false); }
