// Layout for everything under /account. Middleware already blocks
// logged-out visitors at the network edge (lib/supabase/middleware.ts),
// but this mirrors the admin layout's approach — checking again here,
// server-side, before rendering anything. Two independent checks for a
// customer's own private data is the same reasoning as the admin side,
// not overkill.
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

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

  // A logged-in auth user with no matching customers row is a genuine
  // edge case (e.g. the trigger hasn't finished, or something went
  // wrong at signup) rather than something to paper over with fallback
  // data — sending them to sign-in again is honest about the account
  // not being ready, not a silent broken dashboard.
  if (!customer) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-brand-tint">
      <DashboardNavbar customer={customer} />
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">{children}</main>
    </div>
  );
}
