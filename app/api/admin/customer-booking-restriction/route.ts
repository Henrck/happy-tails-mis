import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile, error: profileError } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || !["admin", "superadmin"].includes(String(profile?.role))) return NextResponse.json({ error: "Admin or SuperAdmin access required." }, { status: 403 });

    const input: unknown = await request.json();
    if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const body = input as Record<string, unknown>;
    const customerId = body.customerId;
    const action = body.action;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    const duration = body.duration;
    if (typeof customerId !== "string" || !/^[a-f\d-]{36}$/i.test(customerId)) return NextResponse.json({ error: "Invalid customer account." }, { status: 400 });
    if (action !== "restrict" && action !== "lift") return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    if (reason.length < 5 || reason.length > 500) return NextResponse.json({ error: "Enter a reason between 5 and 500 characters." }, { status: 400 });
    if (action === "restrict" && !["1", "7", "30", "permanent"].includes(String(duration))) return NextResponse.json({ error: "Choose a valid restriction duration." }, { status: 400 });

    const durationDays = action === "restrict" && duration !== "permanent" ? Number(duration) : null;
    const { data, error } = await auth.rpc("happytails_admin_manage_customer_booking_restriction", {
      p_customer_id: customerId, p_action: action, p_reason: reason, p_duration_days: durationDays,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Best-effort audit log; the restriction and penalty-event write are atomic in SQL.
    try {
      const admin = createAdminClient();
      await admin.from("audit_logs").insert({ actor_id: user.id, actor_role: profile.role, action: action === "restrict" ? "customer.booking_restricted" : "customer.booking_restriction_lifted", target_type: "customer", target_id: customerId, details: { reason, duration: action === "restrict" ? duration : null, restriction_until: data?.restriction_until ?? null } });
    } catch (auditError) { console.warn("Booking restriction audit log could not be written", auditError); }
    return NextResponse.json({ ok: true, action, restrictionUntil: data?.restriction_until ?? null });
  } catch (error) {
    console.error("Customer booking restriction failed", error);
    return NextResponse.json({ error: "Unable to update the customer's booking restriction." }, { status: 500 });
  }
}
