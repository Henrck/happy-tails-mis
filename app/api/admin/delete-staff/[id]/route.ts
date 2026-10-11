// DELETE /api/admin/delete-staff/[id]
// Superadmin-only. Permanently removes a staff auth user and related records.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  const actor = auth.user;
  if (authError || !actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [{ data: actorProfile, error: profileError }, { data: staffRow, error: staffError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", actor.id).maybeSingle(),
    supabase.from("staff_profiles").select("status").eq("id", actor.id).maybeSingle(),
  ]);

  // Unlike /admin page requests, /api/admin routes are NOT in the proxy
  // matcher. A role check alone is insufficient: a deactivated actor's
  // existing JWT could still call a service-role API operation.
  if (profileError || staffError || !actorProfile || !staffRow) {
    return NextResponse.json({ error: "Account access could not be verified." }, { status: 403 });
  }
  if (actorProfile.role !== "superadmin" || staffRow.status !== "active") {
    return NextResponse.json({ error: "Only an active superadmin can permanently delete accounts." }, { status: 403 });
  }

  if (id === actor.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  // Log BEFORE deleting, while the target still exists.
  await adminClient.from("audit_logs").insert({
    actor_id: actor.id,
    actor_role: actorProfile.role,
    action: "staff.deleted",
    target_type: "staff",
    target_id: id,
  });

  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
