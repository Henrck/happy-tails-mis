"use client";
// Matches the uploaded dashboard image: same top nav as the public
// landing page (Home/Services/Products/About/Contact), but the Login
// button is replaced with an avatar + dropdown (Sign Out), and a
// second row of account-specific tabs sits below it.
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { fetchUnreadNotificationCount, subscribeToNotifications } from "@/lib/supabase/notifications";
import type { Customer } from "@/lib/types/users";

const topNavLinks = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/#about", label: "About Us" },
  { href: "/#footer", label: "Contact Us" },
];

const accountTabs = [
  { href: "/account", label: "My Pets", icon: "paw" },
  { href: "/account/appointments", label: "Book Appointment", icon: "calendar" },
  { href: "/account/notifications", label: "Notification", icon: "bell" },
  { href: "/account/appointments/history", label: "Appointment History", icon: "history" },
  { href: "/account/profile", label: "My Account", icon: "user" },
];

function TabIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    paw: "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z",
    calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0",
    history: "M3 3v6h6M3 12a9 9 0 1 0 3-6.7L3 9M12 7v5l4 2",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

export default function DashboardNavbar({ customer }: { customer: Customer }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const { count } = await fetchUnreadNotificationCount(customer.id);
    setUnreadCount(count);
  }, [customer.id]);

  useEffect(() => {
    async function init() {
      await loadUnreadCount();
    }
    init();
    const unsubscribe = subscribeToNotifications(customer.id, loadUnreadCount);
    return unsubscribe;
  }, [customer.id, loadUnreadCount]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <nav className="bg-brand-pink shadow-md">
        <div className="flex items-center justify-between px-6 md:px-10 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.png" alt="Happy Tails" width={36} height={36} className="rounded-full bg-white" />
            <span className="text-white font-semibold text-lg italic">Happy Tails</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-white text-sm font-medium">
            {topNavLinks.map((link) => (
              <Link key={link.label} href={link.href} className="hover:opacity-80">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-pink-100 py-1 z-30" onMouseLeave={() => setMenuOpen(false)}>
                <div className="px-4 py-2 border-b border-pink-50">
                  <p className="text-sm font-semibold text-zinc-800 truncate">{customer.full_name}</p>
                </div>
                <Link href="/account/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-zinc-600 hover:bg-brand-tint">
                  My Account
                </Link>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="bg-white border-b border-pink-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center gap-1 overflow-x-auto">
          {accountTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-500 hover:text-brand-pink"
                }`}
              >
                <TabIcon name={tab.icon} />
                {tab.label}
                {tab.icon === "bell" && unreadCount > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
