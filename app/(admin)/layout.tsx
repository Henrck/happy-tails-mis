// Layout for everything under /admin. The proxy (middleware) already
// blocks non-superadmins at the network edge, but we check again here, on
// the server, before rendering anything — two independent checks for
// something this sensitive is intentional, not redundant.
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

  if (profile?.role !== "superadmin") {
    redirect("/account");
  }

  // Not every superadmin necessarily has a staff_profiles row (the
  // owner account may predate that table) — only watch if one exists,
  // since there's nothing to deactivate otherwise.
  const { data: staffRow } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      {staffRow && <AccountStatusWatcher userId={user.id} table="staff_profiles" />}
      <AdminShell>{children}</AdminShell>
    </>
  );
}
