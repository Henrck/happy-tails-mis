// POST /api/admin/reset-staff-password/[id]
// Superadmin-only. Generates a random temporary password, sets it via
// the admin client, and returns it ONCE so the superadmin can share it
// with the staff member directly. There's no email-sending set up yet,
// so this is the practical option — the alternative (Supabase's
// password reset email flow) needs email templates configured, which
// hasn't happened yet either.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: actor } } = await supabase.auth.getUser();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: actorProfile } = await supabase.from("profiles").select("role").eq("id", actor.id).single();
  if (!actorProfile || actorProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Only the superadmin can reset staff passwords." }, { status: 403 });
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
