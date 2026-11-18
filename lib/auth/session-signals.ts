// Browser-side signals between the session checks:
//  * "happytails:session-replaced" (window event): this sign-in was ended
//    because the account signed in on another device/browser. SessionGuard
//    shows a pop-up explaining it before signing out.
//  * LOGOUT_KEY (localStorage): tells the other tabs of THIS browser why the
//    session ended (idle, replaced, or the user pressed Log Out).
export const SESSION_REPLACED_EVENT = "happytails:session-replaced";
export const LOGOUT_KEY = "happytails:signed-out";

export type LogoutReason = "idle" | "replaced" | "manual";

export function announceLogout(reason: LogoutReason) {
  try { localStorage.setItem(LOGOUT_KEY, `${reason}:${Date.now()}`); } catch { /* storage may be unavailable */ }
}

/** True if this browser logged out on purpose in the last minute (another tab's Log Out). */
export function recentManualLogout(): boolean {
  try {
    const [reason, at] = (localStorage.getItem(LOGOUT_KEY) ?? "").split(":");
    return reason === "manual" && Date.now() - Number(at) < 60_000;
  } catch {
    return false;
  }
}

/** Auth errors that mean this sign-in no longer exists on the server. */
export function isEndedSessionError(error: { code?: string; name?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "session_not_found" || error.code === "refresh_token_not_found"
    || error.name === "AuthSessionMissingError";
}

export function announceSessionReplaced() {
  window.dispatchEvent(new Event(SESSION_REPLACED_EVENT));
}
