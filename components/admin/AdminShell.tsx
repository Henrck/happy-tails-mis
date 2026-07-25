"use client";
// Client wrapper around the admin area: owns the sidebar open/closed state
// (toggled by the hamburger in the top bar) and handles logout. Kept
// separate from app/(admin)/layout.tsx so that layout can stay a Server
// Component and do the auth/role check server-side before anything here
// even renders.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminSidebar from "./AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar open={sidebarOpen} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-zinc-900 text-zinc-300 text-xs font-semibold tracking-wide px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-white hover:text-brand-pink-light transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          DASHBOARD ADMIN
        </header>

        <main className="flex-1 bg-[#FDF1F7] p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
