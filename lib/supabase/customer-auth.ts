// Issue #6: username availability uses a rate-limited same-origin API.
// Resolving a username to an email in the browser is intentionally removed.
// The login POST endpoint handles username/email -> password verification
// privately and NEVER returns the resolved email to the browser.
import { validateUsername as validateStaffUsername } from "@/lib/validation/staff";

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export async function isUsernameTaken(username: string): Promise<{ taken: boolean; error: string | null }> {
  try {
    const response = await fetch("/api/auth/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ username }),
    });
    const result = (await response.json().catch(() => null)) as
      | { taken?: boolean; error?: string }
      | null;
    if (!response.ok || typeof result?.taken !== "boolean") {
      return {
        taken: false,
        error: result?.error ?? "Username availability could not be checked. Please try again.",
      };
    }
    return { taken: result.taken, error: null };
  } catch {
    return { taken: false, error: "Username availability could not be checked. Please try again." };
  }
}

export function validateUsernameFormat(username: string): string | null {
  if (username.includes("@")) return "Username can't contain @ — that would be ambiguous with an email.";
  if (username.length > 20) return "Username must be 20 characters or fewer.";
  return validateStaffUsername(username);
}
