"use client";
// Shared site nav bar — used on the homepage (over the hero photo) and on
// standalone pages like /products (as a normal top bar). "Home", "Services",
// and "About Us"/"Contact Us" are anchor links back to homepage sections;
// "Products" is a real route since it now has its own dedicated page.
//
// On mobile, the link list collapses behind a hamburger button (there was
// previously no way to reach these links on small screens at all — this
// fixes that) and slides open as a dropdown panel in the same pink theme.
//
// Anchor links (href starting with "/#") are handled manually with
// scrollIntoView rather than relying on Next.js's default same-page hash
// navigation, which doesn't reliably trigger a scroll — a known rough edge
// with the App Router's <Link> component.
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // If we land on "/" with a #hash already in the URL (e.g. someone clicked
  // an anchor link from /products, which is a real page navigation), scroll
  // to it once the page has painted.
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
        // Already on the homepage — scroll directly, don't let Next.js
        // attempt (and fail) its own hash navigation.
        e.preventDefault();
        scrollToId(id);
        history.pushState(null, "", href);
      }
      // If we're on a different page (e.g. /products), let Link do a real
      // navigation to "/" — the useEffect above handles scrolling once
      // the homepage has loaded.
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-brand-pink shadow-md">
      <div className="flex items-center justify-between px-6 md:px-10 py-3">
        <Link href="/" className="flex items-center gap-2" onClick={(e) => handleNavClick(e, "/")}>
          <Image
            src="/images/logo.png"
            alt="Happy Tails"
            width={36}
            height={36}
            className="rounded-full bg-white"
          />
          <span className="text-white font-semibold text-lg italic">Happy Tails</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-white text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="hover:opacity-80"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="flex items-center gap-1.5 bg-sky-300 hover:bg-sky-400 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z"/>
            </svg>
            Login
          </Link>

          {/* Hamburger — mobile only */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="md:hidden text-white p-1"
          >
            {isOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          isOpen ? "max-h-64" : "max-h-0"
        }`}
      >
        <div className="flex flex-col px-6 pb-4 pt-1 gap-3 text-white text-sm font-medium bg-brand-pink-dark">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="py-1.5 border-b border-white/15 last:border-none"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
