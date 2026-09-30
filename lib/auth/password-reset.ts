import { createHash, randomBytes, randomInt } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const OTP_EXPIRY_MINUTES = 10;
export const RESET_TOKEN_EXPIRY_MINUTES = 10;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getPepper() {
  const pepper = process.env.PASSWORD_RESET_OTP_SECRET;
  if (!pepper) throw new Error("Missing PASSWORD_RESET_OTP_SECRET");
  return pepper;
}

export function hashValue(value: string) {
  return createHash("sha256")
    .update(`${getPepper()}:${value}`)
    .digest("hex");
}


export async function findUserByEmail(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  return null;
}

export function createOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function createResetToken() {
  return randomBytes(32).toString("hex");
}

export function expiresAt(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function sendPasswordResetOtp(email: string, otp: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Happy Tails password reset code",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#27272a">
          <h2 style="margin:0 0 16px">Reset your Happy Tails password</h2>
          <p style="margin:0 0 16px">We received a request to reset your password.</p>
          <p style="margin:0 0 8px">Your verification code is:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:10px;margin:16px 0 24px">${otp}</div>
          <p style="margin:0 0 8px">This code expires in ${OTP_EXPIRY_MINUTES} minutes and can only be used once.</p>
          <p style="margin:16px 0 0;color:#71717a">If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${body}`);
  }
}
