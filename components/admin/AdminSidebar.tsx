"use client";
// Collapsible admin sidebar. Toggled via the hamburger icon in the top bar
// (state lives in the parent AdminShell so the top bar's button can
// control it). Matches Josh's reference: pink theme, logo + "Admin" at
// top, nav items with icons, Log Out pinned to the bottom.
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
  { href: "/admin/operations", label: "Operation Management", icon: "sliders" },
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
    chart: "M4 20V10M11 20V4M18 20v-7",
    users: "M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 6-6s6 2 6 6M17 11a3 3 0 1 0 0-6M15 21c0-2.5 1.2-4.3 3-5.2 2 .8 4 2.6 4 5.2",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

export default function AdminSidebar({
  open,
  onLogout,
}: {
  open: boolean;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`bg-brand-pink text-white flex flex-col shrink-0 transition-all duration-300 overflow-hidden ${
        open ? "w-64" : "w-0"
      }`}
    >
      <div className="w-64 flex flex-col h-full">
        <div className="flex flex-col items-center gap-2 py-6 border-b border-white/15">
          <Image src="/images/logo.png" alt="Happy Tails" width={72} height={72} className="w-16 h-auto" />
          <span className="text-lg font-bold">Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/15 border-l-4 border-white"
                    : "border-l-4 border-transparent hover:bg-white/10"
                }`}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-6 py-4 text-sm font-medium border-t border-white/15 hover:bg-white/10 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
}
