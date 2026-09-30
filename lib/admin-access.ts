// Routes that staff accounts (profiles.role === "admin") are not allowed to access.
// Keep this list centralized so middleware and the sidebar use the same policy.
// Staff retain access to normal day-to-day operations such as appointments,
// pet services, POS sales, inventory, pet records, and their profile.
export const SUPERADMIN_ONLY_ROUTES = [
  "/admin/service-management",
  "/admin/users",
  "/admin/website-management",
  "/admin/reports",
  "/admin/pos/configuration",
];

export function isSuperadminOnlyRoute(pathname: string): boolean {
  return SUPERADMIN_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}
