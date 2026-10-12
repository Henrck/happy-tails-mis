// Issue #6: the signup username availability check stays functional,
// but callers can no longer invoke is_username_taken directly in Supabase.
// This limited endpoint NEVER returns an email or a user identifier.
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeAuthQuota, isSameOriginJsonPost, readSmallJson } from "@/lib/auth/username-security";
import { validateUsername as validateStaffUsername } from "@/lib/validation/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJsonPost(request)) return respond({ error: "Invalid request." }, 403);
  const body = await readSmallJson(request);
  if (!body || typeof body.username !== "string") return respond({ error: "Invalid username." }, 400);
  const username = body.username.trim();
  if (username.length > 20 || username.includes("@") || validateStaffUsername(username)) {
    return respond({ error: "Invalid username." }, 400);
  }
  try {
    const admin = createAdminClient();
    const quota = await consumeAuthQuota(admin, request, "availability");
    if (quota.unavailable) return respond({ error: "Username availability is temporarily unavailable." }, 503);
    if (!quota.allowed) return respond({ error: "Too many checks. Please try again in 15 minutes." }, 429);
    const { data, error } = await admin.rpc("is_username_taken", { check_username: username });
    if (error || typeof data !== "boolean") {
      console.error("Issue #6 username availability RPC failure", error?.code ?? "invalid result");
      return respond({ error: "Username availability is temporarily unavailable." }, 503);
    }
    return respond({ taken: data });
  } catch {
    return respond({ error: "Username availability is temporarily unavailable." }, 503);
  }
}
