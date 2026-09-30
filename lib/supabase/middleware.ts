// Called by the root proxy.ts on every request to /account/* or /admin/*.
// Refreshes the session and enforces authentication, account status, and
// role access for the admin workspace.
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAccountRoute = request.nextUrl.pathname.startsWith("/account");

  if (!user && (isAdminRoute || isAccountRoute)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (isAdminRoute || isAccountRoute)) {
    const [{ data: customerRow }, { data: staffRow }] = await Promise.all([
      supabase.from("customers").select("status").eq("id", user.id).maybeSingle(),
      supabase.from("staff_profiles").select("status").eq("id", user.id).maybeSingle(),
    ]);
    const status = customerRow?.status ?? staffRow?.status ?? "active";

    if (status !== "active") {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.searchParams.set("deactivated", "1");
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "superadmin" && profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/account";
      return NextResponse.redirect(redirectUrl);
    }

    // Staff can use the operational parts of the admin workspace, but cannot
    // open configuration/management routes even if they manually type the URL.
    if (profile.role === "admin" && isSuperadminOnlyRoute(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
