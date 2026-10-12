// Issue #6: customer + staff username/email login without email disclosure.
// The resolved email, password and Supabase service role key NEVER appear
// in the response. This endpoint issues the same SSR auth cookies that
// the existing @supabase/ssr browser client understands.
import { createHash } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeAuthQuota, isSameOriginJsonPost, readSmallJson } from "@/lib/auth/username-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BAD_LOGIN = "Invalid username/email or password.";
function reply(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginJsonPost(request)) return reply("Invalid request.", 403);
  const body = await readSmallJson(request);
  if (!body) return reply("Invalid request.", 400);
  const identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (identifier.length < 3 || identifier.length > 254 || !password || password.length > 1024) {
    return reply(BAD_LOGIN, 401);
  }
  const isEmail = identifier.includes("@");
  if (!isEmail && !/^[A-Za-z0-9_.]{3,20}$/.test(identifier)) return reply(BAD_LOGIN, 401);

  try {
    const admin = createAdminClient();
    const quota = await consumeAuthQuota(admin, request, "login");
    if (quota.unavailable) return reply("Sign-in service is temporarily unavailable.", 503);
    if (!quota.allowed) return reply("Too many sign-in attempts. Try again in 15 minutes.", 429);

    let email: string | null = isEmail ? identifier : null;
    if (!isEmail) {
      // Resolve both customer and STAFF usernames privately. The legacy
      // email_for_username RPC is customer-oriented; it does not reliably
      // cover staff_profiles usernames. Never send any resolved email to
      // the browser. Always verify the password with Supabase Auth below.
      // Escape LIKE wildcards (especially underscores, valid in usernames)
      // and still compare exact normalized usernames after the query.
      const escapedUsername = identifier.replace(/[\\%_]/g, "\\$&");
      const [customerLookup, staffLookup] = await Promise.all([
        admin.rpc("email_for_username", { lookup_username: identifier }),
        admin.from("staff_profiles")
          .select("id, username")
          .ilike("username", escapedUsername)
          .limit(20),
      ]);

      if (customerLookup.error || staffLookup.error) {
        console.error("Issue #6 username lookup unavailable", {
          customer: customerLookup.error?.code ?? null,
          staff: staffLookup.error?.code ?? null,
        });
        return reply("Sign-in service is temporarily unavailable.", 503);
      }

      const customerEmail = typeof customerLookup.data === "string" &&
        customerLookup.data.includes("@") ? customerLookup.data : null;
      const exactStaffMatches = (staffLookup.data ?? []).filter(
        (row) => typeof row.username === "string" &&
          row.username.toLowerCase() === identifier.toLowerCase(),
      );
      if (exactStaffMatches.length > 1) {
        // A database missing a case-insensitive unique index may contain
        // duplicate staff usernames. Never choose an arbitrary account.
        return reply(BAD_LOGIN, 401);
      }

      if (exactStaffMatches.length === 1) {
        // staff_profiles.email can legitimately be NULL: staff creation
        // originally stored the email in auth.users only. Read it by the
        // matched, server-side staff UUID, NOT from client input.
        const staffAuth = await admin.auth.admin.getUserById(exactStaffMatches[0].id);
        if (staffAuth.error) {
          console.error("Issue #6 staff auth lookup failed", staffAuth.error.name);
          return reply("Sign-in service is temporarily unavailable.", 503);
        }
        const staffEmail = staffAuth.data.user?.email ?? null;
        if (!staffEmail) return reply(BAD_LOGIN, 401);

        // If the same username belongs to different customer and staff
        // accounts, reject it instead of selecting the wrong identity.
        // Both can still use their email addresses to sign in.
        if (customerEmail && customerEmail.toLowerCase() !== staffEmail.toLowerCase()) {
          return reply(BAD_LOGIN, 401);
        }
        email = staffEmail;
      } else {
        email = customerEmail;
      }
    }

    // Perform a password check even for unknown usernames to minimize
    // response-timing differences. This fake address cannot be registered.
    const authEmail = email ?? `${createHash("sha256").update(identifier.toLowerCase()).digest("hex").slice(0, 24)}@invalid.happytails.invalid`;

    const successfulResponse = NextResponse.json({ ok: true, redirectTo: "/account" }, {
      headers: { "Cache-Control": "no-store" },
    });
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          // Update the incoming request's cookie state as well as the
          // pending successful response. Supabase SSR may read cookies again
          // later in this *same request* after signInWithPassword(); leaving
          // request.cookies unchanged makes authenticated queries look anon.
          // These cookies reach the browser only if we return success.
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              successfulResponse.cookies.set(name, value, options);
            });
          },
        },
      },
    );
    const { data: login, error: loginError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });
    if (loginError || !login.user || !email) return reply(BAD_LOGIN, 401);

    // Authentication has already succeeded, so server-only service_role
    // may check this verified user's exact ID. This avoids an RLS/SSR-cookie
    // race during login without weakening role or active-status policy.
    // NEVER accept a role, status, or account ID from the request body.
    const { data: profile, error: profileError } = await admin
      .from("profiles").select("role").eq("id", login.user.id).maybeSingle();
    if (profileError || !profile || typeof profile.role !== "string") {
      console.error("Issue #6 login: verified user has unreadable/missing role profile", profileError?.code ?? "not_found");
      return reply("Account access could not be verified. Please contact support.", 403);
    }
    const isStaff = profile.role === "admin" || profile.role === "superadmin";
    // Supabase's typed query parser requires literal select strings. A
    // conditional select such as isStaff ? "status" : "status, username"
    // produces a ParserError instead of a typed row at build time.
    // Query the role's authoritative table explicitly (Issue #5 policy).
    const accountResult = isStaff
      ? await admin.from("staff_profiles")
          .select("status")
          .eq("id", login.user.id)
          .maybeSingle()
      : await admin.from("customers")
          .select("status, username")
          .eq("id", login.user.id)
          .maybeSingle();
    const { data: account, error: statusError } = accountResult;
    if (statusError || !account) {
      console.error("Issue #6 login: verified user's account status row missing/unreadable", {
        role: profile.role,
        code: statusError?.code ?? "not_found",
      });
      return reply("Account access could not be verified. Please contact support.", 403);
    }
    if (account.status !== "active") {
      return reply("This account is inactive or archived. Please contact support.", 403);
    }

    // Preserve Issue #1: on the first confirmed email login, restore a
    // customer's null username from that user's verified Auth metadata.
    // A conditional update never overwrites an existing username.
    if (!isStaff && "username" in account && !account.username) {
      const pending = login.user.user_metadata?.username;
      if (typeof pending === "string" && /^[A-Za-z0-9_.]{3,20}$/.test(pending.trim())) {
        const { error: syncError } = await admin.from("customers")
          .update({ username: pending.trim() })
          .eq("id", login.user.id)
          .is("username", null);
        if (syncError) {
          console.error("Issue #6: username recovery failed", syncError.code ?? "update failed");
          return reply("Account setup could not be completed. Please contact support.", 503);
        }
      }
    }

    // The response body contains only a role-dependent route. No email,
    // tokens, or indication of whether an unknown username exists.
    if (isStaff) {
      // Construct the identical success response with the correct route,
      // preserving the exact auth cookies set by the SSR client.
      const response = NextResponse.json({ ok: true, redirectTo: "/admin" }, {
        headers: { "Cache-Control": "no-store" },
      });
      successfulResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
      return response;
    }
    return successfulResponse;
  } catch (error) {
    console.error("Issue #6 sign-in endpoint failure", error instanceof Error ? error.name : "unknown");
    return reply("Sign-in service is temporarily unavailable.", 503);
  }
}
