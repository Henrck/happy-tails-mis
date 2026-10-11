// Defense in depth: customer pages require a verified, active customer row.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import AccountStatusWatcher from "@/components/AccountStatusWatcher";

export default async function DashboardLayout({
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
  if (profile.role === "admin" || profile.role === "superadmin") redirect("/admin");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (customerError || !customer) redirect("/sign-in?access=unverified");
  if (customer.status !== "active") redirect("/sign-in?deactivated=1");

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-tint">
      <AccountStatusWatcher userId={auth.user.id} table="customers" />
      <DashboardNavbar customer={customer} />
      <main className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
