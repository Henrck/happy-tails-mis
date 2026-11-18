"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { announceLogout } from "@/lib/auth/session-signals";
import AdminSidebar from "./AdminSidebar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { useStaffUnreadCount } from "@/lib/hooks/useStaffUnreadCount";

export default function AdminShell({ children, role }: { children: React.ReactNode; role?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const unreadNotifications = useStaffUnreadCount(role === "admin" || role === "superadmin");
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setMobile(query.matches);
      setSidebarOpen((previous) => query.matches ? false : previous || !query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  // Close the mobile drawer after navigating. Adjusting state during render
  // avoids an extra effect pass; the media-query sync already closes it on resize.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (mobile) setSidebarOpen(false);
  }

  // The RPC validates the authenticated account and suppresses duplicate
  // session-open events within 30 minutes; route navigations are not sign-ins.
  useEffect(() => {
    if (role !== "admin" && role !== "superadmin") return;
    const db = createClient();
    void db.rpc("happytails_staff_session_activity", { p_action: "Session opened" });
  }, [role]);

  async function handleLogout() {
    setLogoutConfirmOpen(false);
    const supabase = createClient();
    // Record before clearing the authenticated session. Do not prevent logout
    // if audit logging is temporarily unavailable.
    await supabase.rpc("happytails_staff_session_activity", { p_action: "Signed out" });
    // Tell this browser's other tabs it was a normal Log Out (not a sign-in elsewhere).
    announceLogout("manual");
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return <div className="ht-admin-shell flex min-h-screen">
    {mobile && sidebarOpen && <button type="button" className="ht-admin-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <div className={`ht-admin-navigation ${mobile && sidebarOpen ? "ht-admin-navigation-open" : ""}`}>
      <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} onLogout={() => setLogoutConfirmOpen(true)} role={role} unreadNotifications={unreadNotifications} />
    </div>
    <main className="ht-admin-content flex-1 min-w-0 bg-[#FDF1F7] p-4 sm:p-6 md:p-8 overflow-y-auto">
      {mobile && <div className="ht-admin-mobile-bar"><button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="ht-admin-menu-button"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button><span className="font-semibold text-brand-pink">HappyTails {role === "admin" ? "Staff" : "Admin"}</span>
        <Link href="/admin/notifications" aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} className="relative ml-auto flex h-10 w-10 items-center justify-center rounded-full text-brand-pink hover:bg-pink-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          {unreadNotifications > 0 && <span className="absolute right-1 top-1 min-w-4 rounded-full bg-brand-pink px-1 text-center text-[10px] font-bold leading-4 text-white">{unreadNotifications > 99 ? "99+" : unreadNotifications}</span>}
        </Link></div>}
      {children}
    </main>
    {logoutConfirmOpen && <ConfirmDialog title="Log Out" message="Are you sure you want to log out?" confirmLabel="Log Out" danger onConfirm={handleLogout} onCancel={() => setLogoutConfirmOpen(false)} />}
  </div>;
}
