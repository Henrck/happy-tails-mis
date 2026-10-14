"use client";

import { useCallback, useEffect, useState } from "react";
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
  { href: "/account", label: "Dashboard", icon: "dashboard" },
  { href: "/account/pets", label: "My Pets", icon: "paw" },
  { href: "/account/appointments", label: "Book Appointment", icon: "calendar" },
  { href: "/account/notifications", label: "Notification", icon: "bell" },
  { href: "/account/appointments/history", label: "Appointment History", icon: "history" },
  { href: "/account/profile", label: "My Account", icon: "user" },
];

function TabIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    dashboard: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
    paw: "M8 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 21c-3 0-6-1.5-6-4.5S9 13 12 13s6 .5 6 3.5S15 21 12 21z",
    calendar: "M4 5h16v16H4zM4 9h16M8 3v4M16 3v4",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 0 1-3.4 0",
    history: "M3 3v6h6M3 12a9 9 0 1 0 3-6.7L3 9M12 7v5l4 2",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export default function DashboardNavbar({ customer }: { customer: Customer }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    const { count } = await fetchUnreadNotificationCount(customer.id);
    setUnreadCount(count);
  }, [customer.id]);

  useEffect(() => {
    loadUnreadCount();
    const unsubscribe = subscribeToNotifications(customer.id, loadUnreadCount);
    return unsubscribe;
  }, [customer.id, loadUnreadCount]);

  useEffect(() => {
    if (!logoutOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !signingOut) setLogoutOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [logoutOpen, signingOut]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setLogoutOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      setSignOutError("Could not log out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div>
      <nav className="bg-brand-pink shadow-md">
        <div className="mx-auto flex min-h-[64px] items-center justify-between px-4 sm:px-6 md:px-10">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image src="/images/logo.png" alt="Happy Tails" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full bg-white" />
            <span className="truncate text-base font-semibold italic text-white sm:text-lg">Happy Tails</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-white md:flex">
            {topNavLinks.map((link) => <Link key={link.label} href={link.href} className="hover:opacity-80">{link.label}</Link>)}
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Open navigation menu" aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 md:hidden">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button type="button" onClick={() => setAccountOpen((v) => !v)} aria-label="Account menu" aria-expanded={accountOpen} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" /></svg>
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-56 overflow-hidden rounded-2xl border border-pink-100 bg-white py-1 shadow-xl sm:w-56">
                <div className="border-b border-pink-50 px-4 py-3"><p className="truncate text-sm font-semibold text-zinc-800">{customer.full_name}</p></div>
                <Link href="/account/profile" onClick={() => setAccountOpen(false)} className="block px-4 py-3 text-sm text-zinc-600 hover:bg-brand-tint">My Account</Link>
                <button type="button" onClick={() => { setAccountOpen(false); setSignOutError(""); setLogoutOpen(true); }} className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50">Sign Out</button>
              </div>
            )}
          </div>
        </div>
        {menuOpen && <div className="border-t border-white/15 px-4 pb-3 pt-2 md:hidden"><div className="grid gap-1">{topNavLinks.map((link) => <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-white hover:bg-white/10">{link.label}</Link>)}</div></div>}
      </nav>

      <div className="border-b border-pink-100 bg-white">
        <div className="mx-auto max-w-6xl overflow-x-auto px-2 sm:px-4 md:px-6">
          <div className="flex min-w-max items-center">
            {accountTabs.map((tab) => {
              const isActive = pathname === tab.href || (tab.href === "/account/pets" && pathname.startsWith("/account/pets/"));
              return <Link key={tab.href} href={tab.href} aria-current={isActive ? "page" : undefined} className={`relative flex min-h-[48px] shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${isActive ? "border-brand-pink text-brand-pink" : "border-transparent text-zinc-500 hover:text-brand-pink"}`}>
                <TabIcon name={tab.icon} /><span>{tab.label}</span>
                {tab.icon === "bell" && unreadCount > 0 && <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </Link>;
            })}
          </div>
        </div>
      </div>

      {logoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-[3px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !signingOut) setLogoutOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="customer-logout-title" aria-describedby="customer-logout-description" className="w-full max-w-sm rounded-3xl border border-pink-100 bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-brand-pink">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6" /></svg>
            </div>
            <h2 id="customer-logout-title" className="mt-5 text-xl font-bold text-zinc-800">Log out of Happy Tails?</h2>
            <p id="customer-logout-description" className="mt-2 text-sm leading-6 text-zinc-500">Are you sure you want to log out of your account?</p>
            {signOutError && <p role="alert" className="mt-3 text-sm text-red-600">{signOutError}</p>}
            <div className="mt-7 flex gap-3">
              <button type="button" autoFocus disabled={signingOut} onClick={() => setLogoutOpen(false)} className="flex-1 rounded-xl border border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-pink-50 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={signingOut} onClick={handleSignOut} className="flex-1 rounded-xl bg-brand-pink px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{signingOut ? "Logging out..." : "Yes, Log Out"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
