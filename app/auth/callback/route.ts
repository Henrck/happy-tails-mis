import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Exact paths only: never redirect to user-supplied `next` URLs.
export async function GET(request: NextRequest) {
  const callbackUrl = new URL(request.url);
  const code = callbackUrl.searchParams.get("code");
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!code || callbackUrl.searchParams.has("error")) {
    return redirect("/sign-in?google_error=oauth");
  }

  // Capture Supabase's PKCE cookies on the same response that exchanges the
  // authorization code. These cookies must survive the final redirect.
  let response = redirect("/sign-in?google_error=oauth");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const setRedirect = (path: string) => {
    const next = redirect(path);
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      next.cookies.set(name, value, options));
    next.headers.set("Cache-Control", "no-store");
    response = next;
  };

  try {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return response;

    const { data: auth, error: userError } = await supabase.auth.getUser();
    if (userError || !auth.user) return response;

    // Use server-side DB reads to match the password login's role and active
    // status policy. Do not trust email, name, or role fields from Google.
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (profileError || !profile || typeof profile.role !== "string") {
      await supabase.auth.signOut();
      setRedirect("/sign-in?google_error=setup");
      return response;
    }
    const isStaff = profile.role === "admin" || profile.role === "superadmin";
    const table = isStaff ? "staff_profiles" : "customers";
    const { data: account, error: accountError } = await admin.from(table)
      .select("status").eq("id", auth.user.id).maybeSingle();
    if (accountError || !account) {
      await supabase.auth.signOut();
      setRedirect("/sign-in?google_error=setup");
      return response;
    }
    if (account.status !== "active") {
      await supabase.auth.signOut();
      setRedirect("/sign-in?deactivated=1");
      return response;
    }
    setRedirect(isStaff ? "/admin" : "/account");
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error instanceof Error ? error.name : "unknown");
    await supabase.auth.signOut().catch(() => undefined);
    setRedirect("/sign-in?google_error=oauth");
    return response;
  }
}
