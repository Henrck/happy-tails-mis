// Defense in depth: the admin layout enforces the same account policy as
// middleware even if the layout is rendered independently of a page redirect.
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
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/sign-in");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError || !profile) redirect("/sign-in?access=unverified");
  if (profile.role !== "superadmin" && profile.role !== "admin") {
    redirect("/account");
  }

  const { data: staffRow, error: staffError } = await supabase
    .from("staff_profiles")
    .select("id, status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (staffError || !staffRow) redirect("/sign-in?access=unverified");
  if (staffRow.status !== "active") redirect("/sign-in?deactivated=1");

  return (
    <>
      <AccountStatusWatcher userId={auth.user.id} table="staff_profiles" />
      <AdminShell role={profile.role}>{children}</AdminShell>
    </>
  );
}
