import { NextResponse } from "next/server";
import { RESEND_COOLDOWN_SECONDS, OTP_EXPIRY_MINUTES, createOtp, expiresAt, getAdminClient, findUserByEmail, hashValue, normalizeEmail, publicPasswordResetError, sendPasswordResetOtp } from "@/lib/auth/password-reset";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const supabase = getAdminClient();
    const now = new Date();
    const { data: recent, error: recentError } = await supabase.from("password_reset_otps").select("created_at").eq("email", email).is("verified_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recentError) throw new Error(`PASSWORD_RESET_TABLE_CHECK_FAILED:${recentError.message}`);
    if (recent?.created_at) {
      const secondsSinceRequest = (Date.now() - new Date(recent.created_at).getTime()) / 1000;
      if (secondsSinceRequest < RESEND_COOLDOWN_SECONDS) return NextResponse.json({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceRequest)} seconds before requesting another code.` }, { status: 429 });
    }
    const user = await findUserByEmail(supabase, email);
    if (!user) return NextResponse.json({ ok: true, message: "If that email is registered, a verification code has been sent." });
    const otp = createOtp();
    const { error: deleteError } = await supabase.from("password_reset_otps").delete().eq("email", email).is("verified_at", null);
    if (deleteError) throw new Error(`PASSWORD_RESET_DELETE_FAILED:${deleteError.message}`);
    const { error: insertError } = await supabase.from("password_reset_otps").insert({ email, user_id: user.id, otp_hash: hashValue(otp), expires_at: expiresAt(OTP_EXPIRY_MINUTES), attempts: 0, created_at: now.toISOString() });
    if (insertError) throw new Error(`PASSWORD_RESET_INSERT_FAILED:${insertError.message}`);
    try { await sendPasswordResetOtp(email, otp); }
    catch (emailError) { await supabase.from("password_reset_otps").delete().eq("email", email).eq("otp_hash", hashValue(otp)); throw emailError; }
    return NextResponse.json({ ok: true, message: "A verification code has been sent to your email." });
  } catch (error) {
    console.error("Password reset request failed", error);
    return NextResponse.json({ error: publicPasswordResetError(error) }, { status: 500 });
  }
}
