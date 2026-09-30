// Staff accounts (profiles.role === "admin", created by superadmin via
// User Management) get full /admin dashboard access EXCEPT the routes
// listed here. Keeping this in one place means middleware (the actual
// enforcement — a hidden nav link alone is not security) and the
// sidebar (what staff even see as an option) can never drift apart.
//
// The three exclusions, and why:
// - /admin/website-management — literally site configuration (content,
//   images, design) — the clearest match for "no configuration
//   settings" from the ask.
// - /admin/service-management — controls package pricing/add-ons
//   business-wide, plus the Pet Avatars config screen. Business-level
//   pricing decisions, not day-to-day staff work.
// - /admin/users — creating/deactivating accounts (including other
//   staff) is a permissions-escalation risk if left open to staff;
//   locked down regardless of how "configuration" is defined.
// These three are a judgment call beyond what was explicitly asked —
// flagged for Josh to confirm or adjust; changing access is just
// editing this one array.
export const SUPERADMIN_ONLY_ROUTES = [
  "/admin/website-management",
  "/admin/service-management",
  "/admin/users",
];

export function isSuperadminOnlyRoute(pathname: string): boolean {
  return SUPERADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}
