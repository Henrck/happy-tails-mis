// Called by the root proxy.ts on every request to /account/* or /admin/*.
// Refreshes the session, then checks:
//   - not logged in at all -> redirect to /sign-in
//   - logged in but visiting /admin without the "superadmin" role ->
//     redirect away (to /account). Note: "admin" (staff) role exists in
//     the schema but has no dashboard access built yet — only superadmin
//     passes this check for now, by design.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Deactivating an account (Customer or Staff Detail modal in User
  // Management) previously only flipped a status column — nothing
  // actually enforced it, so a deactivated user could still sign in
  // and use every route normally. This runs on every /account and
  // /admin request, so it catches both a fresh sign-in attempt and an
  // already-logged-in session's next navigation. The corresponding
  // *live* kick-out (no navigation needed) is handled client-side by
  // AccountStatusWatcher, since middleware only runs on new requests.
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

    if (profile?.role !== "superadmin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/account";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
