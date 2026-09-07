"use client";
// Shared site nav bar. Logo is now dynamic (site_settings key "site_logo")
// — falls back to the bundled default if no override exists yet.
//
// REAL BUG FIXED: this always showed "Login," even to a customer who
// was already signed in — it never checked session state at all.
// Clicking "Login" while already logged in redirected to /sign-in
// anyway, which reads as being forced to log in again even though a
// valid session already existed. Now checks auth on mount and shows an
// account icon (linking to /account) instead, matching the pattern
// DashboardNavbar already uses for the logged-in customer area.
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/#about", label: "About Us" },
  { href: "/#footer", label: "Contact Us" },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Navbar({ logoUrl }: { logoUrl?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = still checking, avoids a Login->icon flash
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));

    // Also react to sign-in/sign-out happening in another tab or via
    // this same session, so the button updates without a full reload.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (pathname === "/" && window.location.hash) {
      const id = window.location.hash.slice(1);
      const timeout = setTimeout(() => scrollToId(id), 100);
      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    setIsOpen(false);
    if (href === "/") {
      if (pathname === "/") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (pathname === "/") {
        e.preventDefault();
        scrollToId(id);
        history.pushState(null, "", href);
      }
    }
  }

  const resolvedLogo = logoUrl || "/images/logo.png";
  const isRemote = !!logoUrl && logoUrl !== "/images/logo.png";

  return (
    <nav className="sticky top-0 z-50 bg-brand-pink shadow-md">
      <div className="flex items-center justify-between px-6 md:px-10 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={(e) => handleNavClick(e, "/")}>
          <Image src={resolvedLogo} alt="Happy Tails" width={36} height={36} className="rounded-full bg-white" unoptimized={isRemote} />
          <span className="text-white font-semibold text-lg italic">Happy Tails</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-white text-sm font-medium">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className="hover:opacity-80">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn === null ? (
            // Still checking session — render an empty placeholder of
            // the same size rather than flashing "Login" (wrong for a
            // logged-in customer) or the account icon (wrong for a
            // genuine visitor) before the real answer is known.
            <div className="w-9 h-9" aria-hidden="true" />
          ) : isLoggedIn ? (
            <Link
              href="/account"
              aria-label="Go to your account"
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
              </svg>
            </Link>
          ) : (
            <Link href="/sign-in" className="flex items-center gap-1.5 bg-sky-300 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z"/>
              </svg>
              Login
            </Link>
          )}

          <button onClick={() => setIsOpen((v) => !v)} aria-label={isOpen ? "Close menu" : "Open menu"} aria-expanded={isOpen} className="md:hidden text-white p-1">
            {isOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${isOpen ? "max-h-64" : "max-h-0"}`}>
        <div className="flex flex-col px-6 pb-4 pt-1 gap-3 text-white text-sm font-medium bg-brand-pink-dark">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href} onClick={(e) => handleNavClick(e, link.href)} className="py-1.5 border-b border-white/15 last:border-none">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
