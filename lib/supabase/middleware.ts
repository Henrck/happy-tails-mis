// Issue #5: server-side, fail-closed authentication + account-status checks.
// The proxy runs for /account and /admin on every matched request.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSuperadminOnlyRoute } from "@/lib/admin-access";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Preserve any refreshed/cleared auth cookies when redirecting. Otherwise
  // a redirect could discard cookie updates made by getUser()/signOut().
  function redirectTo(target: string) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  }

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAccountRoute = pathname === "/account" || pathname.startsWith("/account/");
  if (!isAdminRoute && !isAccountRoute) return response;

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) return redirectTo("/sign-in");

  // Never assume missing profiles or unreadable account rows are active.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profileError || !profile || typeof profile.role !== "string") {
    return redirectTo("/sign-in?access=unverified");
  }

  const isStaff = profile.role === "admin" || profile.role === "superadmin";
  // Staff/superadmin accounts must have an ACTIVE staff_profiles row.
  // Customers must have an ACTIVE customers row. Never fall back to
  // another account table just because the authoritative row is missing.
  const table = isStaff ? "staff_profiles" : "customers";
  const { data: account, error: accountError } = await supabase
    .from(table)
    .select("status")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (accountError || !account) return redirectTo("/sign-in?access=unverified");

  if (account.status !== "active") {
    await supabase.auth.signOut();
    return redirectTo("/sign-in?deactivated=1");
  }

  if (isAdminRoute) {
    if (!isStaff) return redirectTo("/account");
    // "admin" is a staff role. Management/configuration is superadmin-only.
    if (profile.role === "admin" && isSuperadminOnlyRoute(pathname)) {
      return redirectTo("/admin");
    }
  }

  // Do not let staff/superadmin accounts enter the customer dashboard.
  if (isAccountRoute && isStaff) return redirectTo("/admin");

  return response;
}
