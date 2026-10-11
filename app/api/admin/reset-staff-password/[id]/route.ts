// POST /api/admin/reset-staff-password/[id]
// Superadmin-only. Issues a temporary password directly to the superadmin.
import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join("");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const actor = auth.user;
  if (authError || !actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [{ data: actorProfile, error: profileError }, { data: staffRow, error: staffError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", actor.id).maybeSingle(),
    supabase.from("staff_profiles").select("status").eq("id", actor.id).maybeSingle(),
  ]);
  if (profileError || staffError || !actorProfile || !staffRow) {
    return NextResponse.json({ error: "Account access could not be verified." }, { status: 403 });
  }
  if (actorProfile.role !== "superadmin" || staffRow.status !== "active") {
    return NextResponse.json({ error: "Only an active superadmin can reset staff passwords." }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const tempPassword = generateTempPassword();
  const { error } = await adminClient.auth.admin.updateUserById(id, { password: tempPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await adminClient.from("audit_logs").insert({
    actor_id: actor.id,
    actor_role: actorProfile.role,
    action: "staff.password_reset",
    target_type: "staff",
    target_id: id,
  });

  return NextResponse.json({ tempPassword });
}
