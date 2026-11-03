import { createClient } from "@/lib/supabase/client";
import { validateUsername } from "@/lib/validation/staff";

/** Atomic, authenticated change of the current Super Admin username. */
export async function changeSuperadminUsername(value: string): Promise<{ username: string | null; error: string | null }> {
  const username = value.trim();
  const invalid = validateUsername(username);
  if (invalid) return { username: null, error: invalid };
  if (username.length > 20) return { username: null, error: "Username must not exceed 20 characters." };

  const { data, error } = await createClient().rpc("happytails_change_superadmin_username", {
    p_username: username,
  });
  if (error) return { username: null, error: error.message };
  if (typeof data !== "string") return { username: null, error: "Could not verify that the username was updated." };
  return { username: data, error: null };
}
