"use client";
// Session security for every signed-in page (customer and staff):
//  1. Idle logout: no mouse movement, hover, click, scroll, touch or key press
//     for 10 minutes signs the user out. A warning appears for the last minute.
//     Activity is shared across tabs of the same browser via localStorage.
//  2. Single session: signing in elsewhere ends this session on the server
//     (see app/api/auth/login and app/auth/callback). This page notices within
//     ~30 seconds (or immediately on focus) and first shows a pop-up saying the
//     account was signed in somewhere else; pressing OK signs out.
import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, MonitorSmartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  announceLogout, isEndedSessionError, LOGOUT_KEY, recentManualLogout, SESSION_REPLACED_EVENT,
} from "@/lib/auth/session-signals";

const IDLE_LIMIT_MS = 10 * 60 * 1000;
const WARNING_MS = 60 * 1000;
const SESSION_CHECK_MS = 30 * 1000;
const ACTIVITY_WRITE_MS = 5 * 1000;
const ACTIVITY_KEY = "happytails:last-activity";
const ACTIVITY_EVENTS = ["mousemove", "mouseover", "pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;

type Reason = "idle" | "replaced";
type StoredActivity = { sid: string; at: number };

/** Session id claim from the Supabase access token (identifies this sign-in). */
function sessionIdFrom(accessToken: string | undefined): string {
  try {
    const payload = accessToken?.split(".")[1];
    if (!payload) return "unknown";
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.session_id === "string" ? json.session_id : "unknown";
  } catch {
    return "unknown";
  }
}

function readActivity(): StoredActivity | null {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVITY_KEY) ?? "null");
    return value && typeof value.sid === "string" && typeof value.at === "number" ? value : null;
  } catch {
    return null;
  }
}

function writeActivity(value: StoredActivity) {
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(value)); } catch { /* storage may be unavailable */ }
}

export default function SessionGuard({ staff = false }: { staff?: boolean }) {
  const [supabase] = useState(createClient);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [replaced, setReplaced] = useState(false);
  const replacedRef = useRef(false);
  const lastActivity = useRef(0);
  const lastWrite = useRef(0);
  const sessionId = useRef<string | null>(null);
  const signingOut = useRef(false);

  const signOut = useCallback(async (reason: Reason, fromOtherTab = false) => {
    if (signingOut.current) return;
    signingOut.current = true;
    if (!fromOtherTab) {
      announceLogout(reason);
      if (staff && reason === "idle") {
        // Best-effort staff audit entry; never block the sign-out.
        await Promise.resolve(supabase.rpc("happytails_staff_session_activity", { p_action: "Signed out" })).catch(() => undefined);
      }
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    window.location.replace(`/sign-in?reason=${reason}`);
  }, [staff, supabase]);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActivity.current = now;
    setSecondsLeft(left => (left === null ? left : null));
    if (sessionId.current && now - lastWrite.current >= ACTIVITY_WRITE_MS) {
      lastWrite.current = now;
      writeActivity({ sid: sessionId.current, at: now });
    }
  }, []);

  // This sign-in was ended by a sign-in elsewhere: explain it before signing out.
  // (If this browser just pressed Log Out in another tab, simply follow it.)
  const showReplaced = useCallback(() => {
    if (signingOut.current || replacedRef.current) return;
    if (recentManualLogout()) { signingOut.current = true; window.location.replace("/sign-in"); return; }
    replacedRef.current = true;
    setSecondsLeft(null);
    setReplaced(true);
  }, []);

  const tick = useCallback(() => {
    if (!sessionId.current || signingOut.current || replacedRef.current) return;
    // Another tab may have been active more recently.
    const shared = readActivity();
    if (shared?.sid === sessionId.current && shared.at > lastActivity.current) lastActivity.current = shared.at;
    const remaining = IDLE_LIMIT_MS - (Date.now() - lastActivity.current);
    if (remaining <= 0) { void signOut("idle"); return; }
    setSecondsLeft(remaining <= WARNING_MS ? Math.ceil(remaining / 1000) : null);
  }, [signOut]);

  const checkSession = useCallback(async () => {
    if (signingOut.current || replacedRef.current) return;
    const { error } = await supabase.auth.getUser();
    if (isEndedSessionError(error)) showReplaced();
  }, [showReplaced, supabase]);

  // Other checks (e.g. the account status watcher) can report an ended session too.
  useEffect(() => {
    window.addEventListener(SESSION_REPLACED_EVENT, showReplaced);
    return () => window.removeEventListener(SESSION_REPLACED_EVENT, showReplaced);
  }, [showReplaced]);

  useEffect(() => {
    let active = true;
    const cleanups: (() => void)[] = [];

    void supabase.auth.getSession().then(({ data }) => {
      if (!active || !data.session) return;
      const sid = sessionIdFrom(data.session.access_token);
      sessionId.current = sid;
      const stored = readActivity();
      const now = Date.now();
      if (stored?.sid === sid && now - stored.at >= IDLE_LIMIT_MS) {
        // This sign-in was left idle (e.g. the browser was closed) for 10+ minutes.
        void signOut("idle");
        return;
      }
      // A new sign-in starts a fresh idle timer.
      lastActivity.current = stored?.sid === sid ? Math.max(stored.at, now) : now;
      lastWrite.current = now;
      writeActivity({ sid, at: lastActivity.current });

      const options = { passive: true, capture: true } as const;
      ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, markActive, options));
      cleanups.push(() => ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, markActive, options)));

      const onStorage = (event: StorageEvent) => {
        if (event.key === LOGOUT_KEY && event.newValue) {
          const reason = event.newValue.split(":")[0];
          if (reason === "manual") { signingOut.current = true; window.location.replace("/sign-in"); }
          else if (reason === "replaced") showReplaced();
          else void signOut("idle", true);
        }
      };
      const onVisible = () => { if (document.visibilityState === "visible") { tick(); void checkSession(); } };
      window.addEventListener("storage", onStorage);
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("focus", onVisible);
      const idleTimer = window.setInterval(tick, 1000);
      const sessionTimer = window.setInterval(() => { void checkSession(); }, SESSION_CHECK_MS);
      cleanups.push(() => {
        window.removeEventListener("storage", onStorage);
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("focus", onVisible);
        window.clearInterval(idleTimer);
        window.clearInterval(sessionTimer);
      });
    });

    return () => { active = false; cleanups.forEach(fn => fn()); };
  }, [checkSession, markActive, showReplaced, signOut, supabase, tick]);

  if (replaced) {
    return <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-4" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="replaced-title" aria-describedby="replaced-description" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand-pink"><MonitorSmartphone size={24} aria-hidden="true"/></span>
        <h2 id="replaced-title" className="mt-3 text-lg font-bold text-zinc-900">Signed in on another device</h2>
        <p id="replaced-description" className="mt-2 text-sm leading-6 text-zinc-600">
          Your account was just signed in on another device or browser. An account can only be used in one place at a time, so you&apos;ve been signed out here.
        </p>
        <p className="mt-3 rounded-2xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-500">Wasn&apos;t you? Sign in again and change your password right away.</p>
        <button type="button" autoFocus onClick={() => { replacedRef.current = false; void signOut("replaced"); }} className="mt-5 w-full rounded-full bg-brand-pink py-3 text-sm font-bold text-white hover:bg-brand-pink-dark">OK, go to sign in</button>
      </section>
    </div>;
  }

  if (secondsLeft === null) return null;
  const label = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  return <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/55 p-4" role="presentation">
    <section role="alertdialog" aria-modal="true" aria-labelledby="idle-title" aria-describedby="idle-description" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Clock size={24} aria-hidden="true"/></span>
      <h2 id="idle-title" className="mt-3 text-lg font-bold text-zinc-900">Are you still there?</h2>
      <p id="idle-description" className="mt-2 text-sm leading-6 text-zinc-600">For your security, you&apos;ll be signed out after 10 minutes of inactivity.</p>
      <p className="mt-3 text-3xl font-bold tabular-nums text-brand-pink" aria-live="polite">{label}</p>
      <button type="button" autoFocus onClick={markActive} className="mt-5 w-full rounded-full bg-brand-pink py-3 text-sm font-bold text-white">Stay signed in</button>
    </section>
  </div>;
}
