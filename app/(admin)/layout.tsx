// Layout for everything under /admin. The proxy (middleware) already
// blocks non-superadmins at the network edge, but we check again here, on
// the server, before rendering anything — two independent checks for
// something this sensitive is intentional, not redundant.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

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

  return <AdminShell>{children}</AdminShell>;
}
