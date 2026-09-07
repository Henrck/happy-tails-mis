"use client";
// v3: the old top black "DASHBOARD ADMIN" bar (and its hamburger) is
// gone — the hamburger now lives inside the sidebar itself, at the top.
// Because of that, collapsing the sidebar can't fully hide it anymore
// (w-0 would leave nothing to click to reopen it, since there's no
// longer a topbar holding a second toggle) — collapsed state now shows
// a slim icon-only rail instead of disappearing entirely.
//
// The user footer block above Log Out has been removed per request.
//
// Height fix: `h-screen sticky top-0` makes the sidebar's own height
// always equal to the viewport, independent of how tall the page
// content is — previously it was just a flex child with h-full, which
// stretched to match tall pages (e.g. Service Management), pushing Log
// Out far below the fold instead of staying pinned at the bottom.
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "grid" },
  { href: "/admin/appointments", label: "Appointment", icon: "calendar" },
  { href: "/admin/pet-services", label: "Pet Services", icon: "paw" },
  { href: "/admin/pos", label: "Point of Sale", icon: "cart" },
  { href: "/admin/inventory", label: "Inventory", icon: "box" },
  { href: "/admin/pet-records", label: "Pet's Record", icon: "file" },
  { href: "/admin/service-management", label: "Service Management", icon: "sliders" },
  { href: "/admin/website-management", label: "Website Management", icon: "globe" },
  { href: "/admin/reports", label: "Report Management", icon: "chart" },
  { href: "/admin/users", label: "User Management", icon: "users" },
  { href: "/admin/profile", label: "Profile", icon: "user" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
    paw: "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z",
    cart: "M3 4h2l2.5 12h11L21 8H6M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    box: "M4 8l8-4 8 4-8 4-8-4zM4 8v8l8 4 8-4V8M12 12v8",
    file: "M6 3h9l5 5v13H6zM14 3v6h6",
    sliders: "M4 6h16M4 12h16M4 18h16M8 4v4M14 10v4M8 16v4",
    globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9z",
    chart: "M4 20V10M11 20V4M18 20v-7",
    users: "M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 6-6s6 2 6 6M17 11a3 3 0 1 0 0-6M15 21c0-2.5 1.2-4.3 3-5.2 2 .8 4 2.6 4 5.2",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  };
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

export default function AdminSidebar({
  open,
  onToggle,
  onLogout,
}: {
  open: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`h-screen sticky top-0 bg-brand-pink text-white flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${open ? "w-56" : "w-16"}`}>
      <div className={`flex flex-col h-full ${open ? "w-56" : "w-16"}`}>
        <div className={`flex items-center gap-2 py-4 border-b border-white/15 ${open ? "px-4 justify-between" : "px-0 justify-center"}`}>
          {open && (
            <div className="flex items-center gap-2 min-w-0">
              <Image src="/images/logo.png" alt="Happy Tails" width={36} height={36} className="w-9 h-auto shrink-0" />
              <span className="text-sm font-bold truncate">Admin</span>
            </div>
          )}
          <button
            onClick={onToggle}
            aria-label={open ? "Hide sidebar" : "Show sidebar"}
            className="text-white hover:text-brand-pink-light transition-colors shrink-0 w-8 h-8 flex items-center justify-center"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={open ? undefined : item.label}
                className={`flex items-center gap-2.5 py-2 text-[13px] font-medium transition-colors ${open ? "px-5" : "px-0 justify-center"} ${
                  isActive ? "bg-white/15 border-l-4 border-white" : "border-l-4 border-transparent hover:bg-white/10"
                }`}
              >
                <NavIcon name={item.icon} />
                {open && item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          title={open ? undefined : "Log Out"}
          className={`flex items-center gap-2.5 py-3 text-[13px] font-medium border-t border-white/15 hover:bg-white/10 transition-colors ${open ? "px-5" : "px-0 justify-center"}`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          {open && "Log Out"}
        </button>
      </div>
    </aside>
  );
}
