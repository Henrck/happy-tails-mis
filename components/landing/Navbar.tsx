"use client";
// Shared site nav bar. Logo is dynamic and the account action reflects auth state.
// The active navigation item follows both direct navigation and homepage scrolling.
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/", label: "Home", key: "home" },
  { href: "/#services", label: "Services", key: "services" },
  { href: "/products", label: "Products", key: "products" },
  { href: "/#about", label: "About Us", key: "about" },
  { href: "/#footer", label: "Contact Us", key: "contact" },
] as const;

const trackedSections = [
  { id: "services", key: "services" },
  { id: "products", key: "products" },
  { id: "about", key: "about" },
  { id: "footer", key: "contact" },
] as const;

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Navbar({ logoUrl }: { logoUrl?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [activeLink, setActiveLink] = useState<string>("home");
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Keep the active state accurate on route changes and while scrolling the homepage.
  useEffect(() => {
    if (pathname === "/products") {
      setActiveLink("products");
      return;
    }

    if (pathname !== "/") {
      setActiveLink("");
      return;
    }

    const initialHash = window.location.hash.slice(1);
    const initialHashLink = trackedSections.find((section) => section.id === initialHash);
    if (initialHashLink) setActiveLink(initialHashLink.key);
    else if (window.scrollY < 120) setActiveLink("home");

    const navHeight = document.querySelector("nav")?.getBoundingClientRect().height ?? 72;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const currentSection = visibleSections[0]?.target.id;
        const matchingLink = trackedSections.find((section) => section.id === currentSection);
        if (matchingLink) setActiveLink(matchingLink.key);
      },
      {
        root: null,
        rootMargin: `-${Math.round(navHeight)}px 0px -65% 0px`,
        threshold: 0,
      }
    );

    trackedSections.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    const handleScrollToTop = () => {
      if (window.scrollY < 120) setActiveLink("home");
    };
    window.addEventListener("scroll", handleScrollToTop, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScrollToTop);
    };
  }, [pathname]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    setIsOpen(false);
    const selectedLink = navLinks.find((link) => link.href === href);
    if (selectedLink) setActiveLink(selectedLink.key);

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
        window.history.pushState(null, "", href);
      }
    }
  }

  const resolvedLogo = logoUrl || "/images/logo.png";
  const isRemote = !!logoUrl && logoUrl !== "/images/logo.png";

  return (
    <nav className="sticky top-0 z-50 bg-brand-pink shadow-md">
      <div className="flex items-center justify-between px-6 py-3 md:px-10">
        <Link href="/" className="flex items-center gap-2" onClick={(e) => handleNavClick(e, "/")}>
          <Image src={resolvedLogo} alt="Happy Tails" width={36} height={36} className="rounded-full bg-white" unoptimized={isRemote} />
          <span className="text-lg font-semibold italic text-white">Happy Tails</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-white md:flex">
          {navLinks.map((link) => {
            const isActive = activeLink === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                aria-current={isActive ? "page" : undefined}
                className={`relative inline-flex items-center py-2 transition-colors duration-200 hover:text-white/80 ${isActive ? "font-bold" : "font-medium"}`}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-0.5 left-0 h-[3px] w-full origin-center rounded-full bg-white transition-transform duration-200 ${isActive ? "scale-x-100" : "scale-x-0"}`}
                />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn === null ? (
            <div className="h-9 w-9" aria-hidden="true" />
          ) : isLoggedIn ? (
            <Link
              href="/account"
              aria-label="Go to your account"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
              </svg>
            </Link>
          ) : (
            <Link href="/sign-in" className="flex items-center gap-1.5 rounded-full bg-sky-300 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.5c-3.3 0-9.8 1.6-9.8 4.9v2.4h19.6v-2.4c0-3.3-6.5-4.9-9.8-4.9z" />
              </svg>
              Login
            </Link>
          )}

          <button
            onClick={() => setIsOpen((value) => !value)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            className="p-1 text-white md:hidden"
          >
            {isOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            )}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out md:hidden ${isOpen ? "max-h-64" : "max-h-0"}`}>
        <div className="flex flex-col gap-2 bg-brand-pink-dark px-6 pb-4 pt-1 text-sm font-medium text-white">
          {navLinks.map((link) => {
            const isActive = activeLink === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg border-b border-white/15 px-3 py-2.5 transition-colors last:border-none ${isActive ? "bg-white/10 font-bold" : "hover:bg-white/10"}`}
              >
                <span aria-hidden="true" className={`h-5 w-1 rounded-full transition-colors ${isActive ? "bg-white" : "bg-transparent"}`} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
