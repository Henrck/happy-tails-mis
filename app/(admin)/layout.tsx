// Layout for everything under /admin.
// Both superadmins and staff accounts (role = admin) can enter the admin workspace.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";
import AccountStatusWatcher from "@/components/AccountStatusWatcher";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin" && profile?.role !== "admin") {
    redirect("/account");
  }

  const { data: staffRow } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      {staffRow && <AccountStatusWatcher userId={user.id} table="staff_profiles" />}
      <AdminShell role={profile.role}>{children}</AdminShell>
    </>
  );
}
