// DELETE /api/admin/delete-staff/[id]
// Superadmin-only. Permanently deletes the auth user, which cascades to
// remove staff_profiles and profiles automatically (both reference
// auth.users with ON DELETE CASCADE). This needs the admin client — a
// normal client-side delete on staff_profiles alone would leave the
// actual login (auth.users) behind, letting them still sign in with
// nothing left to show for it.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: actor } } = await supabase.auth.getUser();
  if (!actor) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: actorProfile } = await supabase.from("profiles").select("role").eq("id", actor.id).single();
  if (!actorProfile || actorProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Only the superadmin can permanently delete accounts." }, { status: 403 });
  }

  if (id === actor.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Log BEFORE deleting — once the user is gone, target_id would point
  // at nothing (though the row itself is kept regardless, per
  // audit_logs having no FK constraint on target_id).
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
