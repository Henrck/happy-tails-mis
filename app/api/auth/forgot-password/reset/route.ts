import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient, hashValue, isValidPassword } from "@/lib/auth/password-reset";

export const runtime = "nodejs";

const COOKIE_NAME = "happy_tails_password_reset";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters and include uppercase, lowercase, and a special character." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const resetToken = cookieStore.get(COOKIE_NAME)?.value;
    if (!resetToken) {
      return NextResponse.json({ error: "Your verification has expired. Request a new code." }, { status: 401 });
    }

    const supabase = getAdminClient();
    const { data: record, error } = await supabase
      .from("password_reset_otps")
      .select("id,user_id,reset_token_hash,reset_token_expires_at,verified_at,used_at")
      .eq("reset_token_hash", hashValue(resetToken))
      .not("verified_at", "is", null)
      .is("used_at", null)
      .limit(1)
      .maybeSingle();

    if (error || !record || new Date(record.reset_token_expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Your verification has expired. Request a new code." }, { status: 401 });
    }

    const { error: updatePasswordError } = await supabase.auth.admin.updateUserById(record.user_id, { password });
    if (updatePasswordError) throw updatePasswordError;

    await supabase
      .from("password_reset_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id)
      .is("used_at", null);

    const response = NextResponse.json({ ok: true, message: "Your password has been changed successfully." });
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json({ error: "We could not change your password. Please request a new verification code." }, { status: 500 });
  }
}
