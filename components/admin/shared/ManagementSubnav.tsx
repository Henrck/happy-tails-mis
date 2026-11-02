"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type ManagementSection = "services" | "website";

const destinations: Record<ManagementSection, { href: string; label: string; shortLabel?: string }[]> = {
  services: [
    { href: "/admin/service-management", label: "Packages, prices & add-ons", shortLabel: "Packages & pricing" },
    { href: "/admin/service-management/catalog", label: "Services catalog" },
  ],
  website: [
    { href: "/admin/website-management", label: "Website preview" },
    { href: "/admin/website-management/content", label: "Edit website text, services & package images", shortLabel: "Edit website content" },
    { href: "/admin/website-management/branches", label: "Manage Other Branches", shortLabel: "Other branches" },
  ],
};

export default function ManagementSubnav({ section }: { section: ManagementSection }) {
  const pathname = usePathname();
  return (
    <nav aria-label={section === "services" ? "Service Management sections" : "Website Management sections"}
      className="mb-6 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
      {destinations[section].map(({ href, label, shortLabel }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 w-full items-center justify-center rounded-full border-2 px-4 py-2.5 text-center text-sm font-semibold leading-snug transition-colors sm:w-auto sm:px-5 ${
              active
                ? "border-brand-pink bg-brand-pink text-white shadow-sm"
                : "border-brand-pink bg-white text-brand-pink hover:bg-pink-50"
            }`}>
            {shortLabel ? (
              <><span className="sm:hidden">{shortLabel}</span><span className="hidden sm:inline">{label}</span></>
            ) : label}
          </Link>
        );
      })}
    </nav>
  );
}
