"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type StaffRole = "admin" | "superadmin";

/** Role of the signed-in staff member, or null while loading / not staff.
 * UI convenience only: the database enforces the actual permissions. */
export function useStaffRole(): StaffRole | null {
  const [role, setRole] = useState<StaffRole | null>(null);
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (active && (data?.role === "admin" || data?.role === "superadmin")) setRole(data.role);
    });
    return () => { active = false; };
  }, []);
  return role;
}
