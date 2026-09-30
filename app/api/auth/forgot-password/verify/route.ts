import { NextResponse } from "next/server";
import {
  MAX_OTP_ATTEMPTS,
  RESET_TOKEN_EXPIRY_MINUTES,
  createResetToken,
  expiresAt,
  getAdminClient,
  hashValue,
  normalizeEmail,
} from "@/lib/auth/password-reset";

export const runtime = "nodejs";

const COOKIE_NAME = "happy_tails_password_reset";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";

    if (!email || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit verification code from your email." }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data: record, error } = await supabase
      .from("password_reset_otps")
      .select("id,email,user_id,otp_hash,expires_at,attempts,verified_at")
      .eq("email", email)
      .is("verified_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !record) {
      return NextResponse.json({ error: "That code is invalid or has expired. Request a new code and try again." }, { status: 400 });
    }

    if (new Date(record.expires_at).getTime() <= Date.now() || record.attempts >= MAX_OTP_ATTEMPTS) {
      return NextResponse.json({ error: "That code is invalid or has expired. Request a new code and try again." }, { status: 400 });
    }

    const expectedHash = hashValue(code);
    if (expectedHash !== record.otp_hash) {
      await supabase
        .from("password_reset_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      return NextResponse.json({ error: "That code is invalid or has expired. Request a new code and try again." }, { status: 400 });
    }

    const resetToken = createResetToken();
    const { error: updateError } = await supabase
      .from("password_reset_otps")
      .update({
        verified_at: new Date().toISOString(),
        reset_token_hash: hashValue(resetToken),
        reset_token_expires_at: expiresAt(RESET_TOKEN_EXPIRY_MINUTES),
      })
      .eq("id", record.id)
      .is("verified_at", null);

    if (updateError) throw updateError;

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, resetToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RESET_TOKEN_EXPIRY_MINUTES * 60,
    });
    return response;
  } catch (error) {
    console.error("Password reset verification failed", error);
    return NextResponse.json({ error: "We could not verify that code. Please request a new one." }, { status: 500 });
  }
}
