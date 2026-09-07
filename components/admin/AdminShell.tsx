"use client";
// Client wrapper around the admin area: owns the sidebar open/closed state
// and handles logout. Kept separate from app/(admin)/layout.tsx so that
// layout can stay a Server Component and do the auth/role check
// server-side before anything here even renders.
//
// The old top black "DASHBOARD ADMIN" bar is gone — its hamburger moved
// into the sidebar itself. Logout now asks for confirmation instead of
// signing out immediately on click.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "./AdminSidebar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    setLogoutConfirmOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} onLogout={() => setLogoutConfirmOpen(true)} />

      <main className="flex-1 min-w-0 bg-[#FDF1F7] p-6 md:p-8 overflow-y-auto">
        {children}
      </main>

      {logoutConfirmOpen && (
        <ConfirmDialog
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmLabel="Log Out"
          danger
          onConfirm={handleLogout}
          onCancel={() => setLogoutConfirmOpen(false)}
        />
      )}
    </div>
  );
}
