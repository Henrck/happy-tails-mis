// Query + mutation helpers for groomers (Grooming) and kennels
// (Boarding). Both are genuinely simple right now — no sessions to join
// against, since there's no appointments table yet. Adding a
// fetchGroomingSessions()/fetchBoardingSessions() later, once real
// bookings exist, is the natural next step and won't require changing
// anything here.
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
  const supabase = createClient();
  return supabase.from("groomers").insert({ name }).select().single();
}

export async function setGroomerStatus(id: string, status: "active" | "archived") {
  const supabase = createClient();
  return supabase.from("groomers").update({ status }).eq("id", id);
}

export async function fetchKennels() {
  const supabase = createClient();
  const { data, error } = await supabase.from("kennels").select("*").order("size").order("number");
  return { kennels: (data ?? []) as Kennel[], error: error?.message };
}

export async function addKennel(size: KennelSize, number: number) {
  const supabase = createClient();
  return supabase.from("kennels").insert({ size, number }).select().single();
}

export async function removeKennel(id: string) {
  const supabase = createClient();
  return supabase.from("kennels").delete().eq("id", id);
}
