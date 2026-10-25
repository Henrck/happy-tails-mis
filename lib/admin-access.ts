// Keep access decisions shared by the server proxy and navigation.
export const SUPERADMIN_ONLY_ROUTES = [
  "/admin/service-management",
  "/admin/calendar-management",
  "/admin/holiday-closures",
  "/admin/users",
  "/admin/website-management",
  "/admin/reports",
  "/admin/pos/configuration",
];

export function isSuperadminOnlyRoute(pathname: string): boolean {
  return SUPERADMIN_ONLY_ROUTES.some(route => pathname === route || pathname.startsWith(route + "/"));
}
