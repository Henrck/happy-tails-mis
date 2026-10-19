"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "./AdminSidebar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminShell({ children, role }: { children: React.ReactNode; role?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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

  useEffect(() => {
    if (mobile) setSidebarOpen(false);
  }, [pathname, mobile]);

  async function handleLogout() {
    setLogoutConfirmOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="ht-admin-shell flex min-h-screen">
      {mobile && sidebarOpen && (
        <button type="button" className="ht-admin-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`ht-admin-navigation ${mobile && sidebarOpen ? "ht-admin-navigation-open" : ""}`}>
        <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} onLogout={() => setLogoutConfirmOpen(true)} role={role} />
      </div>
      <main className="ht-admin-content flex-1 min-w-0 bg-[#FDF1F7] p-4 sm:p-6 md:p-8 overflow-y-auto">
        {mobile && (
          <div className="ht-admin-mobile-bar">
            <button type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="ht-admin-menu-button">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="font-semibold text-brand-pink">HappyTails {role === "admin" ? "Staff" : "Admin"}</span>
          </div>
        )}
        {children}
      </main>
      {logoutConfirmOpen && (
        <ConfirmDialog title="Log Out" message="Are you sure you want to log out?" confirmLabel="Log Out" danger onConfirm={handleLogout} onCancel={() => setLogoutConfirmOpen(false)} />
      )}
    </div>
  );
}
