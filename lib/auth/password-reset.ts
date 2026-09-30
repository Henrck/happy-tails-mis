import { createHash, randomBytes, randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const OTP_EXPIRY_MINUTES = 10;
export const RESET_TOKEN_EXPIRY_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) throw new Error("CONFIG_SUPABASE_URL_MISSING");
  if (!serviceRoleKey) throw new Error("CONFIG_SUPABASE_SERVICE_ROLE_KEY_MISSING");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getPepper() {
  const pepper = process.env.PASSWORD_RESET_OTP_SECRET?.trim();
  if (!pepper) throw new Error("CONFIG_PASSWORD_RESET_OTP_SECRET_MISSING");
  return pepper;
}

export function hashValue(value: string) { return createHash("sha256").update(`${getPepper()}:${value}`).digest("hex"); }

export async function findUserByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`SUPABASE_ADMIN_LIST_USERS_FAILED:${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export function createOtp() { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
export function createResetToken() { return randomBytes(32).toString("hex"); }
export function expiresAt(minutes: number) { return new Date(Date.now() + minutes * 60_000).toISOString(); }
export function isValidPassword(password: string) { return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[^A-Za-z0-9]/.test(password); }

export async function sendPasswordResetOtp(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey) throw new Error("CONFIG_RESEND_API_KEY_MISSING");
  if (!from) throw new Error("CONFIG_RESEND_FROM_EMAIL_MISSING");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Happy Tails password reset code",
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#27272a"><h2>Reset your Happy Tails password</h2><p>We received a request to reset your password.</p><p>Your verification code is:</p><div style="font-size:36px;font-weight:700;letter-spacing:10px;margin:16px 0 24px">${otp}</div><p>This code expires in ${OTP_EXPIRY_MINUTES} minutes and can only be used once.</p><p style="color:#71717a">If you did not request a password reset, you can safely ignore this email.</p></div>`,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    let detail = body;
    try { const parsed = JSON.parse(body) as { message?: string; name?: string }; detail = parsed.message ?? parsed.name ?? body; } catch {}
    throw new Error(`RESEND_${response.status}:${detail.slice(0, 300)}`);
  }
}

export function publicPasswordResetError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw === "CONFIG_SUPABASE_URL_MISSING") return "Server configuration error: NEXT_PUBLIC_SUPABASE_URL is missing.";
  if (raw === "CONFIG_SUPABASE_SERVICE_ROLE_KEY_MISSING") return "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.";
  if (raw === "CONFIG_PASSWORD_RESET_OTP_SECRET_MISSING") return "Server configuration error: PASSWORD_RESET_OTP_SECRET is missing from .env.local.";
  if (raw === "CONFIG_RESEND_API_KEY_MISSING") return "Server configuration error: RESEND_API_KEY is missing from .env.local.";
  if (raw === "CONFIG_RESEND_FROM_EMAIL_MISSING") return "Server configuration error: RESEND_FROM_EMAIL is missing from .env.local.";
  if (raw.startsWith("SUPABASE_ADMIN_LIST_USERS_FAILED:")) return `Supabase admin authentication failed: ${raw.slice(34)}`;
  if (raw.startsWith("RESEND_401:")) return `Resend rejected the API key: ${raw.slice(10)}`;
  if (raw.startsWith("RESEND_403:")) return `Resend rejected the sender/account: ${raw.slice(10)}`;
  if (raw.startsWith("RESEND_422:")) return `Resend rejected the email data: ${raw.slice(10)}`;
  if (raw.startsWith("RESEND_429:")) return `Resend rate limit reached: ${raw.slice(10)}`;
  if (raw.startsWith("RESEND_")) return `Resend email request failed: ${raw.slice(raw.indexOf(":") + 1)}`;
  if (/password_reset_otps/i.test(raw) && /(relation|table|does not exist|schema cache|PGRST116|PGRST2)/i.test(raw)) return `Password reset database error: ${raw}`;
  return `Password reset server error: ${raw.slice(0, 300)}`;
}
