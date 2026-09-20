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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!customer) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-tint">
      <AccountStatusWatcher userId={user.id} table="customers" />
      <DashboardNavbar customer={customer} />
      <main className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6">
        {children}
      </main>
    </div>
  );
}
