import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StaffAuditLogViewer from "@/components/admin/reports/StaffAuditLogViewer";
export const dynamic = "force-dynamic";
export default async function StaffAuditLogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if (profile?.role !== "superadmin") redirect("/admin");
  return <div className="mx-auto max-w-7xl space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-sm text-zinc-500">Report Management / Audit Logs</p>
        <h1 className="mt-1 text-2xl font-extrabold text-brand-pink">Staff Audit Logs</h1>
        <p className="mt-1 text-sm text-zinc-600">Recorded system changes by staff accounts and trusted server processes. SuperAdmin access only.</p>
      </div>
      <Link href="/admin/reports" className="rounded-full border border-pink-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-pink hover:bg-pink-50">Back to Reports</Link>
    </div>
    <StaffAuditLogViewer />
  </div>;
}
