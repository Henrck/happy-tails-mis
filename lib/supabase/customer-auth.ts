// Customer auth helpers layered on top of Supabase Auth, which only
// supports email-based sign-in natively. These make username login
// possible: resolve a typed username to its real email via the narrow
// email_for_username() RPC (safe for anonymous/pre-login callers — see
// migration 030 for why it's a function, not a direct table read), then
// the actual sign-in still goes through normal signInWithPassword.
import { createClient } from "./client";

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export async function resolveEmailForLogin(identifier: string): Promise<{ email: string | null; error: string | null }> {
  if (looksLikeEmail(identifier)) return { email: identifier, error: null };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("email_for_username", { lookup_username: identifier });
  if (error) return { email: null, error: error.message };
  if (!data) return { email: null, error: "No account found with that username." };
  return { email: data as string, error: null };
}

export async function isUsernameTaken(username: string): Promise<{ taken: boolean; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("is_username_taken", { check_username: username });
  if (error) return { taken: false, error: error.message };
  return { taken: Boolean(data), error: null };
}

// Basic client-side shape validation before ever hitting the network —
// reuses the exact same rules as staff usernames (lib/validation/staff.ts)
// rather than a second, slightly-diverging definition of "valid
// username" living in two places. The only addition here is the @
// check, since customer usernames specifically need to stay
// unambiguous from an email (staff usernames aren't typed into a
// combined username/email login field the way customer ones are).
import { validateUsername as validateStaffUsername } from "@/lib/validation/staff";

export function validateUsernameFormat(username: string): string | null {
  if (username.includes("@")) return "Username can't contain @ — that would be ambiguous with an email.";
  if (username.length > 20) return "Username must be 20 characters or fewer.";
  return validateStaffUsername(username);
}
