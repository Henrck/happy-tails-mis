import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/auth/password-reset";
export const runtime = "nodejs";
export async function GET() {
  const checks: Record<string, string> = {};
  const env = ["NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","PASSWORD_RESET_OTP_SECRET","RESEND_API_KEY","RESEND_FROM_EMAIL"];
  for (const key of env) checks[key] = process.env[key]?.trim() ? "configured" : "missing";
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("password_reset_otps").select("id").limit(1);
    if (error) checks.password_reset_otps = `error: ${error.message}`; else checks.password_reset_otps = "reachable";
  } catch (error) { checks.supabase_admin = error instanceof Error ? error.message : String(error); }
  const ready = Object.values(checks).every((v) => v === "configured" || v === "reachable");
  return NextResponse.json({ ok: ready, checks }, { status: ready ? 200 : 503 });
}
