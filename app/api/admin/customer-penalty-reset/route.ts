import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Super Admin only: reset a customer's penalty points to 0/3. The database
// function checks the role again and records the reset in the penalty history.
export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile, error: profileError } = await auth.from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "superadmin") return NextResponse.json({ error: "Only a Super Admin can reset penalty points." }, { status: 403 });

    const input: unknown = await request.json();
    if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    const body = input as Record<string, unknown>;
    const customerId = body.customerId;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (typeof customerId !== "string" || !/^[a-f\d-]{36}$/i.test(customerId)) return NextResponse.json({ error: "Invalid customer account." }, { status: 400 });
    if (reason.length < 5 || reason.length > 500) return NextResponse.json({ error: "Enter a reason between 5 and 500 characters." }, { status: 400 });

    const { data, error } = await auth.rpc("happytails_admin_reset_customer_penalties", { p_customer_id: customerId, p_reason: reason });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Best-effort audit log; the reset and its history entry are already saved.
    try {
      const admin = createAdminClient();
      await admin.from("audit_logs").insert({ actor_id: user.id, actor_role: profile.role, action: "customer.penalties_reset", target_type: "customer", target_id: customerId, details: { reason, previous_count: data?.previous_count ?? null } });
    } catch (auditError) { console.warn("Penalty reset audit log could not be written", auditError); }
    return NextResponse.json({ ok: true, previousCount: data?.previous_count ?? null });
  } catch (error) {
    console.error("Customer penalty reset failed", error);
    return NextResponse.json({ error: "Unable to reset the customer's penalty points." }, { status: 500 });
  }
}
